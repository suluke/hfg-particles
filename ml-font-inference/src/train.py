"""
Training script for font line segment inference model.
"""

import os
import argparse
import time
from pathlib import Path
from typing import Dict, Optional

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
import numpy as np
from tqdm import tqdm

from dataset import FontDataset, get_training_transforms, get_validation_transforms
from model import create_model
from renderer import LineRenderingLoss, visualize_rendering


class Trainer:
    """Training manager for font line segment model."""
    
    def __init__(self, config: dict):
        self.config = config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        # Create model with adaptive line width
        self.model = create_model(
            model_type=config['model_type'],
            num_segments=config['num_segments'],
            input_size=config['input_size'],
            adaptive_line_width=config.get('adaptive_line_width', True)
        ).to(self.device)
        
        # Print model info
        if hasattr(self.model, 'get_model_info'):
            info = self.model.get_model_info()
            print(f"Model: {info['total_parameters']:,} parameters ({info['model_size_mb']:.1f} MB)")
        
        # Create loss function with simple fixed weights
        self.loss_fn = LineRenderingLoss(
            image_size=config['input_size'],
            line_width=config['line_width'],
            reconstruction_weight=config['reconstruction_weight'],
            regularization_weight=config['regularization_weight'],
            fg_weight=config.get('fg_weight', 2.0),
            bg_weight=config.get('bg_weight', 1.0)
        ).to(self.device)
        
        # Create optimizer
        self.optimizer = optim.AdamW(
            self.model.parameters(),
            lr=config['learning_rate'],
            weight_decay=config['weight_decay']
        )
        
        # Learning rate scheduler
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='min',
            factor=config['lr_decay_factor'],
            patience=config['lr_patience'],
            verbose=True
        )
        
        # Training state
        self.epoch = 0
        self.best_val_loss = float('inf')
        self.train_losses = []
        self.val_losses = []
        
        # Setup directories
        self.checkpoint_dir = Path(config['checkpoint_dir'])
        self.output_dir = Path(config['output_dir'])
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # TensorBoard logging
        if config['use_tensorboard']:
            self.writer = SummaryWriter(log_dir=self.output_dir / 'tensorboard')
        else:
            self.writer = None
    
    def load_datasets(self):
        """Load training and validation datasets."""
        # Training dataset with augmentation
        self.train_dataset = FontDataset(
            data_dir=self.config['data_dir'],
            split='train',
            transform=get_training_transforms()
        )
        
        self.train_loader = DataLoader(
            self.train_dataset,
            batch_size=self.config['batch_size'],
            shuffle=True,
            num_workers=self.config['num_workers'],
            pin_memory=True if self.device.type == 'cuda' else False,
            persistent_workers=False  # Reduces CPU overhead
        )
        
        # Validation dataset
        self.val_dataset = FontDataset(
            data_dir=self.config['data_dir'],
            split='val'
        )
        
        self.val_loader = DataLoader(
            self.val_dataset,
            batch_size=self.config['batch_size'],
            shuffle=False,
            num_workers=self.config['num_workers'],
            pin_memory=True if self.device.type == 'cuda' else False,
            persistent_workers=False  # Reduces CPU overhead
        )
        
        print(f"Training samples: {len(self.train_dataset)}")
        print(f"Validation samples: {len(self.val_dataset)}")
    
    def train_epoch(self) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        
        total_losses = {
            'total_loss': 0.0,
            'reconstruction_loss': 0.0,
            'length_regularization': 0.0,
            'diversity_regularization': 0.0
        }
        num_batches = 0
        
        pbar = tqdm(self.train_loader, desc=f'Epoch {self.epoch}')
        
        for batch_idx, (images, targets) in enumerate(pbar):
            images = images.to(self.device)
            targets = targets.to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            model_output = self.model(images)
            
            # Handle adaptive line width output
            if self.model.adaptive_line_width:
                line_segments, line_widths = model_output
                # Debug: Print line width stats
                if batch_idx == 0:  # Only first batch to avoid spam
                    print(f"Line width stats: min={line_widths.min().item():.4f}, max={line_widths.max().item():.4f}, mean={line_widths.mean().item():.4f}")
                    print(f"Line segment stats: min={line_segments.min().item():.4f}, max={line_segments.max().item():.4f}")
            else:
                line_segments = model_output
                line_widths = None
            
            # Use differentiable rendering loss: render predicted line segments and compare to input images
            loss_dict = self.loss_fn(line_segments, images, line_widths)
            
            loss = loss_dict['total_loss']
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            if self.config['grad_clip'] > 0:
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.config['grad_clip'])
            
            self.optimizer.step()
            
            # Accumulate losses
            for key, value in loss_dict.items():
                total_losses[key] += value.item()
            num_batches += 1
            
            # Update progress bar
            pbar.set_postfix({
                'loss': f"{loss.item():.4f}",
                'lr': f"{self.optimizer.param_groups[0]['lr']:.2e}"
            })
            
            # Log to TensorBoard
            if self.writer and batch_idx % self.config['log_interval'] == 0:
                global_step = self.epoch * len(self.train_loader) + batch_idx
                for key, value in loss_dict.items():
                    self.writer.add_scalar(f'train/{key}', value.item(), global_step)
        
        # Average losses
        avg_losses = {key: value / num_batches for key, value in total_losses.items()}
        return avg_losses
    
    def validate(self) -> Dict[str, float]:
        """Validate the model."""
        self.model.eval()
        
        total_losses = {
            'total_loss': 0.0,
            'reconstruction_loss': 0.0,
            'length_regularization': 0.0,
            'diversity_regularization': 0.0
        }
        num_batches = 0
        
        with torch.no_grad():
            for images, targets in tqdm(self.val_loader, desc='Validation'):
                images = images.to(self.device)
                targets = targets.to(self.device)
                
                # Forward pass
                model_output = self.model(images)
                
                # Handle adaptive line width output
                if self.model.adaptive_line_width:
                    line_segments, line_widths = model_output
                else:
                    line_segments = model_output
                    line_widths = None
                
                # Use differentiable rendering loss for validation too
                loss_dict = self.loss_fn(line_segments, images, line_widths)
                
                # Accumulate losses
                for key, value in loss_dict.items():
                    total_losses[key] += value.item()
                num_batches += 1
        
        # Average losses
        avg_losses = {key: value / num_batches for key, value in total_losses.items()}
        return avg_losses
    
    def save_checkpoint(self, is_best: bool = False):
        """Save model checkpoint."""
        checkpoint = {
            'epoch': self.epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'best_val_loss': self.best_val_loss,
            'config': self.config
        }
        
        # Save latest checkpoint
        latest_path = self.checkpoint_dir / 'latest.pth'
        torch.save(checkpoint, latest_path)
        
        # Save best checkpoint
        if is_best:
            best_path = self.checkpoint_dir / 'best.pth'
            torch.save(checkpoint, best_path)
        
        # Save epoch checkpoint
        epoch_path = self.checkpoint_dir / f'epoch_{self.epoch:03d}.pth'
        torch.save(checkpoint, epoch_path)
    
    def load_checkpoint(self, checkpoint_path: str):
        """Load model checkpoint."""
        checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
        
        try:
            # Try to load the full state dict
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
            self.epoch = checkpoint['epoch']
            self.best_val_loss = checkpoint['best_val_loss']
            print(f"Loaded checkpoint from epoch {self.epoch}")
        except RuntimeError as e:
            if "size mismatch" in str(e) or "Missing key" in str(e) or "Unexpected key" in str(e):
                print(f"⚠️  Architecture mismatch detected: {e}")
                print("⚠️  This checkpoint was saved with a different model architecture.")
                print("⚠️  Starting fresh training with the new architecture...")
                print("⚠️  Use 'make clean' if you want to delete old checkpoints.")
                # Reset training state for fresh start
                self.epoch = 0
                self.best_val_loss = float('inf')
            else:
                # Re-raise if it's a different error
                raise e
    
    def visualize_predictions(self, num_samples: int = 4):
        """Visualize model predictions."""
        self.model.eval()
        
        with torch.no_grad():
            # Get a batch from validation set
            images, targets = next(iter(self.val_loader))
            images = images[:num_samples].to(self.device)
            targets = targets[:num_samples].to(self.device)
            
            # Generate predictions
            model_output = self.model(images)
            
            # Handle adaptive line width output
            if self.model.adaptive_line_width:
                line_segments, line_widths = model_output
            else:
                line_segments = model_output
                line_widths = None
            
            # Save visualizations
            for i in range(num_samples):
                save_path = self.output_dir / f'prediction_epoch_{self.epoch:03d}_sample_{i}.png'
                
                # Visualize rendered lines vs input image
                input_img = images[i].cpu()
                pred_lines = line_segments[i].cpu()
                sample_line_width = line_widths[i].cpu() if line_widths is not None else None
                
                visualize_rendering(pred_lines, input_img, save_path=str(save_path), line_width=sample_line_width)
        
        print(f"Saved {num_samples} prediction visualizations to {self.output_dir}")
    
    def train(self):
        """Main training loop."""
        start_epoch = self.epoch
        end_epoch = self.epoch + self.config['num_epochs']
        
        if start_epoch == 0:
            print(f"Starting training for {self.config['num_epochs']} epochs")
        else:
            print(f"Resuming training from epoch {start_epoch}, will train for {self.config['num_epochs']} more epochs (until epoch {end_epoch})")
        
        for epoch in range(start_epoch, end_epoch):
            self.epoch = epoch
            
            # Train
            train_losses = self.train_epoch()
            self.train_losses.append(train_losses['total_loss'])
            
            # Validate
            val_losses = self.validate()
            self.val_losses.append(val_losses['total_loss'])
            
            # Update learning rate
            self.scheduler.step(val_losses['total_loss'])
            
            # Restart learning rate if it's too low (stuck in local minimum)
            current_lr = self.optimizer.param_groups[0]['lr']
            if current_lr < self.config.get('lr_restart_threshold', 1e-6):
                new_lr = self.config['learning_rate'] * 0.1  # Restart at 10% of original
                for param_group in self.optimizer.param_groups:
                    param_group['lr'] = new_lr
                print(f"Learning rate restarted: {current_lr:.2e} → {new_lr:.2e}")
            
            # Check if best model
            is_best = val_losses['total_loss'] < self.best_val_loss
            if is_best:
                self.best_val_loss = val_losses['total_loss']
            
            # Save checkpoint
            if (epoch + 1) % self.config['save_interval'] == 0:
                self.save_checkpoint(is_best)
            
            # Log to TensorBoard
            if self.writer:
                self.writer.add_scalar('epoch/train_loss', train_losses['total_loss'], epoch)
                self.writer.add_scalar('epoch/val_loss', val_losses['total_loss'], epoch)
                self.writer.add_scalar('epoch/learning_rate', self.optimizer.param_groups[0]['lr'], epoch)
            
            # Visualize predictions
            if (epoch + 1) % self.config['vis_interval'] == 0:
                self.visualize_predictions()
            
            # Print epoch summary with fixed weights
            print(f"Epoch {epoch}: Train Loss: {train_losses['total_loss']:.6f}, "
                  f"Val Loss: {val_losses['total_loss']:.6f}, "
                  f"Best Val: {self.best_val_loss:.6f}, "
                  f"Weights: FG={self.loss_fn.fg_weight:.1f}/BG={self.loss_fn.bg_weight:.1f}")
        
        print("Training completed!")
        
        # Final save
        self.save_checkpoint(is_best=False)
        
        if self.writer:
            self.writer.close()


def get_default_config():
    """Get default training configuration."""
    return {
        # Model
        'model_type': 'cnn',
        'num_segments': 16,
        'input_size': 48,
        
        # Data
        'data_dir': 'data/processed',
        'batch_size': 8,  # Reduced for CPU efficiency
        'num_workers': 1,  # CPU doesn't benefit from multiple workers
        
        # Training
        'num_epochs': 400,
        'learning_rate': 1e-3,  # Higher LR for harder task
        'weight_decay': 5e-4,  # More regularization
        'grad_clip': 1.0,
        
        # Loss function
        'line_width': 0.07,  # Increased from 0.06 to help with horizontal line learning
        'adaptive_line_width': True,   # Predict line width per character for font weight adaptation
        'font_weight_filter': None,   # 'regular', 'light', 'bold', or None for all
        'reconstruction_weight': 1.0,
        'regularization_weight': 0.01,
        
        # Simple fixed loss weighting - relative scaling handles character-specific adjustments
        'fg_weight': 2.0,   # Modest foreground emphasis
        'bg_weight': 1.0,   # Background weight (scaled by relative density per character)
        
        # Learning rate scheduling
        'lr_decay_factor': 0.5,
        'lr_patience': 10,
        'lr_restart_threshold': 1e-6,  # Restart LR if it drops below this
        
        # Logging and saving
        'checkpoint_dir': 'checkpoints',
        'output_dir': 'outputs',
        'save_interval': 10,
        'vis_interval': 10,
        'log_interval': 50,
        'use_tensorboard': True,
    }


def main():
    parser = argparse.ArgumentParser(description='Train font line segment model')
    parser.add_argument('--config', type=str, help='Config file path')
    parser.add_argument('--resume', type=str, help='Resume from checkpoint')
    parser.add_argument('--data-dir', type=str, default='data/processed', help='Data directory')
    parser.add_argument('--epochs', type=int, default=100, help='Number of epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-3, help='Learning rate')
    parser.add_argument('--model-type', type=str, default='cnn', choices=['cnn', 'resnet'], 
                       help='Model architecture')
    
    args = parser.parse_args()
    
    # Get configuration
    config = get_default_config()
    
    # Update config with command line arguments
    if args.data_dir:
        config['data_dir'] = args.data_dir
    if args.epochs:
        config['num_epochs'] = args.epochs
    if args.batch_size:
        config['batch_size'] = args.batch_size
    if args.lr:
        config['learning_rate'] = args.lr
    if args.model_type:
        config['model_type'] = args.model_type
    
    # Optimize config for CPU if no GPU available
    if not torch.cuda.is_available():
        print("GPU not available, optimizing for CPU training...")
        config['batch_size'] = min(config['batch_size'], 8)
        config['num_workers'] = 1
        config['vis_interval'] = 20  # Less frequent visualization
        config['save_interval'] = 20  # Less frequent checkpointing
    
    # Create trainer
    trainer = Trainer(config)
    
    # Load datasets
    trainer.load_datasets()
    
    # Resume from checkpoint if specified
    if args.resume:
        trainer.load_checkpoint(args.resume)
    
    # Start training
    trainer.train()


if __name__ == '__main__':
    main()