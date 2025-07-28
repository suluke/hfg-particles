"""
Font rendering and dataset creation for line segment inference.
"""

import os
import glob
import argparse
import random
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import torchvision.transforms as transforms


class FontDataset(Dataset):
    """Dataset for font glyph to line segment mapping."""
    
    def __init__(self, data_dir: str, split: str = 'train', transform=None):
        self.data_dir = Path(data_dir)
        self.split = split
        self.transform = transform
        
        # Load preprocessed data
        self.images = []
        self.targets = []
        
        split_file = self.data_dir / f"{split}.npz"
        if split_file.exists():
            data = np.load(split_file)
            self.images = data['images']
            self.targets = data['targets']
        else:
            print(f"No preprocessed data found at {split_file}")
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        image = torch.from_numpy(self.images[idx]).float().unsqueeze(0) / 255.0
        target = torch.from_numpy(self.targets[idx]).float()
        
        if self.transform:
            image = self.transform(image)
            
        return image, target


class FontRenderer:
    """Renders font glyphs to bitmaps."""
    
    def __init__(self, image_size: int = 48):
        self.image_size = image_size
        self.ascii_range = range(32, 127)  # Printable ASCII characters
    
    def get_available_fonts(self, font_dir: str = None, filter_weight: str = None, 
                           balanced_weights: bool = False, max_fonts: int = None) -> List[str]:
        """
        Get list of available TTF fonts using matplotlib's font_manager.
        
        Args:
            font_dir: Legacy parameter, ignored (kept for compatibility)
            filter_weight: Optional weight filter ('regular', 'light', 'bold')
            balanced_weights: If True, return equal numbers of light, regular, and bold fonts
            max_fonts: Maximum number of fonts to return
        
        Returns:
            List of font file paths
        """
        # Use matplotlib's font_manager to find all system fonts
        font_paths = []
        
        # Get all font properties from matplotlib's font manager
        font_list = fm.fontManager.ttflist + fm.fontManager.afmlist
        
        for font in font_list:
            # Get the font file path
            if hasattr(font, 'fname') and font.fname:
                # Only include TTF and OTF fonts
                if font.fname.lower().endswith(('.ttf', '.otf')):
                    font_paths.append(font.fname)
        
        # Remove duplicates and sort
        font_paths = sorted(list(set(font_paths)))
        
        # Filter by font weight if specified
        if filter_weight:
            font_paths = self._filter_by_weight(font_paths, filter_weight)
        elif balanced_weights:
            font_paths = self._get_balanced_weights(font_paths, max_fonts)
        
        # Apply max_fonts limit if not already handled by balanced_weights
        if max_fonts and not balanced_weights:
            font_paths = font_paths[:max_fonts]
        
        return font_paths
    
    def _filter_by_weight(self, font_paths: List[str], filter_weight: str) -> List[str]:
        """Filter fonts by specific weight."""
        weight_keywords = {
            'regular': ['Regular', 'Medium', 'Normal', 'Book', 'Roman'],
            'light': ['Light', 'Thin', 'UltraLight', 'ExtraLight'],
            'bold': ['Bold', 'Heavy', 'Black', 'ExtraBold', 'SemiBold']
        }
        
        if filter_weight.lower() not in weight_keywords:
            return font_paths
            
        filtered_paths = []
        keywords = weight_keywords[filter_weight.lower()]
        
        for path in font_paths:
            font_name = os.path.basename(path)
            # Include if contains weight keyword, exclude if contains other weights
            if any(kw in font_name for kw in keywords):
                # Make sure it doesn't contain conflicting weight keywords
                other_keywords = []
                for other_weight, other_kws in weight_keywords.items():
                    if other_weight != filter_weight.lower():
                        other_keywords.extend(other_kws)
                
                if not any(kw in font_name for kw in other_keywords):
                    filtered_paths.append(path)
        
        print(f"Filtered to {len(filtered_paths)} {filter_weight} fonts")
        return filtered_paths
    
    def _get_balanced_weights(self, font_paths: List[str], max_fonts: int = None) -> List[str]:
        """Get balanced selection of light, regular, and bold fonts."""
        weight_keywords = {
            'regular': ['Regular', 'Medium', 'Normal', 'Book', 'Roman'],
            'light': ['Light', 'Thin', 'UltraLight', 'ExtraLight'],
            'bold': ['Bold', 'Heavy', 'Black', 'ExtraBold', 'SemiBold']
        }
        
        # Categorize fonts by weight
        categorized_fonts = {'regular': [], 'light': [], 'bold': []}
        
        for path in font_paths:
            font_name = os.path.basename(path)
            categorized = False
            
            # Check each weight category
            for weight, keywords in weight_keywords.items():
                if any(kw in font_name for kw in keywords):
                    # Make sure it doesn't contain conflicting weight keywords
                    other_keywords = []
                    for other_weight, other_kws in weight_keywords.items():
                        if other_weight != weight:
                            other_keywords.extend(other_kws)
                    
                    if not any(kw in font_name for kw in other_keywords):
                        categorized_fonts[weight].append(path)
                        categorized = True
                        break
            
            # If not categorized, assume it's regular
            if not categorized:
                categorized_fonts['regular'].append(path)
        
        # Calculate balanced distribution
        if max_fonts:
            fonts_per_weight = max_fonts // 3
            remainder = max_fonts % 3
        else:
            # Use the minimum available count across categories
            fonts_per_weight = min(len(fonts) for fonts in categorized_fonts.values())
            remainder = 0
        
        # Select balanced fonts
        balanced_fonts = []
        for i, (weight, fonts) in enumerate(categorized_fonts.items()):
            count = fonts_per_weight + (1 if i < remainder else 0)
            selected = fonts[:count]
            balanced_fonts.extend(selected)
            print(f"Selected {len(selected)} {weight} fonts")
        
        random.shuffle(balanced_fonts)  # Shuffle to mix weights
        print(f"Total balanced fonts: {len(balanced_fonts)}")
        return balanced_fonts
    
    def render_character(self, char: str, font_path: str, font_size: int = 36) -> Optional[np.ndarray]:
        """Render a single character to bitmap."""
        try:
            # Load font
            font = ImageFont.truetype(font_path, font_size)
            
            # Create image with white background
            img = Image.new('L', (self.image_size, self.image_size), color=255)
            draw = ImageDraw.Draw(img)
            
            # Get text bbox to center it
            bbox = draw.textbbox((0, 0), char, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # Center the character
            x = (self.image_size - text_width) // 2 - bbox[0]
            y = (self.image_size - text_height) // 2 - bbox[1]
            
            # Draw character in black
            draw.text((x, y), char, fill=0, font=font)
            
            # Convert to numpy array
            img_array = np.array(img)
            
            # Skip if character didn't render (all white)
            if np.all(img_array == 255):
                return None
                
            return img_array
            
        except Exception as e:
            print(f"Error rendering '{char}' with font {font_path}: {e}")
            return None
    
    def apply_position_offset(self, img_array: np.ndarray, offset_x: int, offset_y: int) -> np.ndarray:
        """Apply position offset to rendered character."""
        if offset_x == 0 and offset_y == 0:
            return img_array
            
        # Create new image filled with white background
        shifted_img = np.full_like(img_array, 255)
        
        # Calculate valid shift bounds
        h, w = img_array.shape
        src_y1 = max(0, -offset_y)
        src_y2 = min(h, h - offset_y)
        src_x1 = max(0, -offset_x)
        src_x2 = min(w, w - offset_x)
        
        dst_y1 = max(0, offset_y)
        dst_y2 = dst_y1 + (src_y2 - src_y1)
        dst_x1 = max(0, offset_x)
        dst_x2 = dst_x1 + (src_x2 - src_x1)
        
        # Copy shifted region
        if src_y2 > src_y1 and src_x2 > src_x1:
            shifted_img[dst_y1:dst_y2, dst_x1:dst_x2] = img_array[src_y1:src_y2, src_x1:src_x2]
        
        return shifted_img
    
    def check_font_support(self, font_path: str) -> List[int]:
        """Check which ASCII characters are supported by the font."""
        try:
            font = TTFont(font_path)
            cmap = font.getBestCmap()
            supported_chars = [char for char in self.ascii_range if char in cmap]
            return supported_chars
        except Exception as e:
            print(f"Error checking font support for {font_path}: {e}")
            return []
    
    def render_font_dataset(self, font_paths: List[str], output_dir: str, samples_per_glyph: int = 3):
        """Render all characters from all fonts with variations and save to disk."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        all_images = []
        all_chars = []
        all_fonts = []
        
        for font_idx, font_path in enumerate(font_paths):
            print(f"Processing font {font_idx + 1}/{len(font_paths)}: {Path(font_path).name}")
            
            # Check which characters are supported
            supported_chars = self.check_font_support(font_path)
            if len(supported_chars) < 50:  # Skip fonts with poor ASCII support
                print(f"Skipping font with limited ASCII support: {len(supported_chars)} chars")
                continue
            
            for char_code in supported_chars:
                char = chr(char_code)
                
                # Generate multiple variations of each glyph
                for variation in range(samples_per_glyph):
                    # Vary font size for diverse character thickness and styles
                    font_sizes = [28, 32, 36, 40, 44]
                    font_size = random.choice(font_sizes)
                    
                    # Render character with varied size
                    img_array = self.render_character(char, font_path, font_size)
                    
                    if img_array is not None:
                        # Add small random position shift to break perfect centering
                        offset_x = random.randint(-2, 2)
                        offset_y = random.randint(-2, 2)
                        
                        # Apply position offset
                        img_array = self.apply_position_offset(img_array, offset_x, offset_y)
                        
                        all_images.append(img_array)
                        all_chars.append(char_code)
                        all_fonts.append(font_idx)
        
        # Convert to numpy arrays
        images = np.stack(all_images)
        chars = np.array(all_chars)
        fonts = np.array(all_fonts)
        
        # Save rendered images
        np.savez_compressed(
            output_dir / 'rendered_glyphs.npz',
            images=images,
            chars=chars,
            fonts=fonts,
            font_paths=font_paths
        )
        
        print(f"Saved {len(images)} rendered glyphs to {output_dir}")
        return images, chars, fonts


def create_dummy_targets(num_samples: int, num_segments: int = 16) -> np.ndarray:
    """Create dummy line segment targets for initial testing."""
    # For now, create random line segments in [-0.5, 0.5] range
    targets = np.random.uniform(-0.5, 0.5, (num_samples, num_segments * 4))
    return targets.astype(np.float32)


def split_dataset(images: np.ndarray, targets: np.ndarray, chars: np.ndarray, 
                 train_ratio: float = 0.8, val_ratio: float = 0.1):
    """Split dataset into train/val/test sets."""
    n_samples = len(images)
    indices = np.random.permutation(n_samples)
    
    train_end = int(train_ratio * n_samples)
    val_end = int((train_ratio + val_ratio) * n_samples)
    
    train_idx = indices[:train_end]
    val_idx = indices[train_end:val_end]
    test_idx = indices[val_end:]
    
    return {
        'train': (images[train_idx], targets[train_idx], chars[train_idx]),
        'val': (images[val_idx], targets[val_idx], chars[val_idx]),
        'test': (images[test_idx], targets[test_idx], chars[test_idx])
    }


def save_dataset_splits(splits: dict, output_dir: str):
    """Save train/val/test splits to disk."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for split_name, (images, targets, chars) in splits.items():
        np.savez_compressed(
            output_dir / f"{split_name}.npz",
            images=images,
            targets=targets,
            chars=chars
        )
        print(f"Saved {split_name} split: {len(images)} samples")


def get_training_transforms():
    """Get image augmentation transforms for training."""
    return transforms.Compose([
        # Small random rotation (±3 degrees)
        transforms.RandomRotation(degrees=(-3, 3), fill=1.0),  # fill=1.0 for white background
        
        # Small random scaling (95% to 105%)
        transforms.RandomAffine(
            degrees=0,
            scale=(0.95, 1.05),
            fill=1.0  # White background for affine transforms
        ),
        
        # Add slight noise (5% probability)
        transforms.RandomApply([
            transforms.Lambda(lambda x: x + torch.randn_like(x) * 0.02)
        ], p=0.05),
        
        # Keep values in valid range [0, 1]
        transforms.Lambda(lambda x: torch.clamp(x, 0.0, 1.0))
    ])


def get_validation_transforms():
    """Get transforms for validation (no augmentation)."""
    return None  # No augmentation for validation


def visualize_samples(dataset: FontDataset, num_samples: int = 8, save_path: Optional[str] = None):
    """Visualize dataset samples."""
    fig, axes = plt.subplots(2, 4, figsize=(12, 6))
    axes = axes.flatten()
    
    for i in range(min(num_samples, len(dataset))):
        image, target = dataset[i]
        
        # Display image
        axes[i].imshow(image.squeeze(), cmap='gray')
        axes[i].set_title(f"Sample {i}")
        axes[i].axis('off')
    
    plt.tight_layout()
    
    # Always save, don't show interactive window
    if save_path is None:
        save_path = "dataset_samples.png"
    
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()  # Close figure to free memory
    print(f"Dataset samples saved to {save_path}")


def main():
    parser = argparse.ArgumentParser(description='Font dataset creation')
    parser.add_argument('--output-dir', default='data/processed', help='Output directory')
    parser.add_argument('--render-fonts', action='store_true', help='Render fonts to images')
    parser.add_argument('--max-fonts', type=int, default=200, help='Maximum number of fonts to use')
    parser.add_argument('--samples-per-glyph', type=int, default=3, help='Number of variations per glyph')
    parser.add_argument('--balanced-weights', action='store_true', help='Use balanced selection of light/regular/bold fonts')
    parser.add_argument('--visualize', action='store_true', help='Visualize dataset samples')
    
    args = parser.parse_args()
    
    renderer = FontRenderer()
    
    if args.render_fonts:
        # Get available fonts with balanced weight selection if requested
        font_paths = renderer.get_available_fonts(
            balanced_weights=args.balanced_weights,
            max_fonts=args.max_fonts if args.max_fonts > 0 else None
        )
        print(f"Using {len(font_paths)} fonts for dataset generation")
        
        # Render fonts with variations
        images, chars, fonts = renderer.render_font_dataset(font_paths, 'data/rendered', args.samples_per_glyph)
        
        # No targets needed - we use image reconstruction loss
        # Create zero targets as placeholder (not used in training)
        targets = np.zeros((len(images), 64), dtype=np.float32)
        
        # Split dataset
        splits = split_dataset(images, targets, chars)
        
        # Save splits
        save_dataset_splits(splits, args.output_dir)
    
    if args.visualize:
        # Load dataset and visualize
        dataset = FontDataset(args.output_dir, split='train')
        if len(dataset) > 0:
            visualize_samples(dataset, save_path=f"{args.output_dir}/samples.png")
        else:
            print("No dataset found to visualize. Run with --render-fonts first.")


if __name__ == '__main__':
    main()