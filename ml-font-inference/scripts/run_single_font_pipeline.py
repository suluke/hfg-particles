#!/usr/bin/env python3
"""
Single Font Pipeline Script

Simple workflow for a single font assuming trained model exists:
1. Font → rendered glyphs (in memory)
2. Rendered glyphs → model predictions using best.pth
3. Model predictions → big PNG visualization

Usage:
    python run_single_font_pipeline.py --font-path /path/to/font.ttf
"""

import argparse
import sys
import os
import time
from pathlib import Path
from typing import Optional

import torch
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
from PIL import Image
from tqdm import tqdm

# Add parent directory to path for imports
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our modules
from src.dataset import FontRenderer
from src.export import FontExporter
from src.renderer import DifferentiableLineRenderer


def check_requirements(font_path: str) -> bool:
    """Check if we have everything needed to run the pipeline."""
    # Check font exists
    if not Path(font_path).exists():
        print(f"✗ Font file not found: {font_path}")
        return False
    
    # Check model exists
    if not Path("checkpoints/best.pth").exists():
        print("✗ No trained model found at checkpoints/best.pth")
        print("Please train a model first using: make train")
        return False
    
    print(f"✓ Font file: {font_path}")
    print(f"✓ Trained model: checkpoints/best.pth")
    return True


def render_font_characters(font_path: str) -> dict:
    """Render font characters to bitmaps in memory."""
    print("=" * 60)
    print("STEP 1: Font → rendered glyphs (in memory)")
    print("=" * 60)
    
    font_renderer = FontRenderer(image_size=48)
    ascii_chars = list(range(32, 127))  # Printable ASCII
    
    rendered_chars = {}
    
    print(f"Rendering {len(ascii_chars)} characters...")
    for char_code in tqdm(ascii_chars, desc="Rendering"):
        char = chr(char_code)
        try:
            rendered = font_renderer.render_character(char, font_path, font_size=32)
            if rendered is not None:
                rendered_chars[char_code] = rendered
            else:
                print(f"Warning: Could not render '{char}' (code {char_code})")
        except Exception as e:
            print(f"Error rendering '{char}': {e}")
    
    print(f"✓ Successfully rendered {len(rendered_chars)}/{len(ascii_chars)} characters")
    return rendered_chars


def generate_line_segments(rendered_chars: dict) -> np.ndarray:
    """Generate line segments using the trained model."""
    print("=" * 60)
    print("STEP 2: Rendered glyphs → model predictions using best.pth")
    print("=" * 60)
    
    # Initialize exporter
    exporter = FontExporter("checkpoints/best.pth", device='cpu')
    exporter.load_model()
    
    # Storage for line segments: 256 characters × 16 segments × 4 coordinates
    font_data = np.zeros((256, 16, 4), dtype=np.float32)
    
    with torch.no_grad():
        for char_code, rendered_char in tqdm(rendered_chars.items(), desc="Generating line segments"):
            # Prepare input tensor
            input_tensor = torch.from_numpy(rendered_char).float().unsqueeze(0).unsqueeze(0) / 255.0
            input_tensor = input_tensor.to(exporter.device)
            
            # Generate line segments
            model_output = exporter.model(input_tensor)
            
            # Handle both old and new model outputs
            if isinstance(model_output, tuple):
                # New model with adaptive line width
                predicted_segments, predicted_line_widths = model_output
                segments = predicted_segments[0].cpu().numpy()  # Shape: (16, 4)
            else:
                # Old model with fixed line width
                segments = model_output[0].cpu().numpy()  # Shape: (16, 4)
            
            # Store in font data array
            font_data[char_code] = segments
    
    print(f"✓ Generated line segments for {len(rendered_chars)} characters")
    return font_data


def create_visualization(font_data: np.ndarray, rendered_chars: dict, font_path: str) -> bool:
    """Create big PNG visualization with all renderings."""
    print("=" * 60)
    print("STEP 3: Model predictions → big PNG visualization")
    print("=" * 60)
    
    try:
        ascii_chars = list(rendered_chars.keys())
        
        # Calculate grid size (roughly square)
        grid_cols = 12  # 12 columns
        grid_rows = (len(ascii_chars) + grid_cols - 1) // grid_cols
        
        # Image size per character cell
        cell_size = 96  # 96x96 pixels per character
        img_width = grid_cols * cell_size
        img_height = grid_rows * cell_size
        
        # Create big image
        big_img = np.ones((img_height, img_width, 3), dtype=np.uint8) * 255  # White background
        
        # Initialize renderer
        renderer = DifferentiableLineRenderer(image_size=48)
        
        print(f"Creating {img_width}x{img_height} visualization...")
        
        for i, char_code in enumerate(tqdm(ascii_chars, desc="Creating visualization")):
            char = chr(char_code)
            row = i // grid_cols
            col = i % grid_cols
            
            # Get original rendered character
            original = rendered_chars[char_code]
            
            # Get line segments for this character
            segments = font_data[char_code]  # Shape: (16, 4)
            
            # Render line segments
            segments_tensor = torch.from_numpy(segments).float().unsqueeze(0)
            with torch.no_grad():
                rendered = renderer(segments_tensor)
                rendered_np = rendered[0, 0].cpu().numpy()
            
            # Create side-by-side comparison
            cell_img = np.ones((cell_size, cell_size, 3), dtype=np.uint8) * 255
            
            # Original on left half (48x48)
            original_resized = np.array(Image.fromarray(original).resize((48, 48)))
            start_y = (cell_size - 48) // 2
            start_x = 0
            if len(original_resized.shape) == 2:
                cell_img[start_y:start_y+48, start_x:start_x+48, 0] = original_resized
                cell_img[start_y:start_y+48, start_x:start_x+48, 1] = original_resized  
                cell_img[start_y:start_y+48, start_x:start_x+48, 2] = original_resized
            
            # Rendered on right half
            rendered_uint8 = (rendered_np * 255).astype(np.uint8)
            rendered_resized = np.array(Image.fromarray(rendered_uint8).resize((48, 48)))
            start_x = 48
            cell_img[start_y:start_y+48, start_x:start_x+48, 0] = rendered_resized
            cell_img[start_y:start_y+48, start_x:start_x+48, 1] = rendered_resized
            cell_img[start_y:start_y+48, start_x:start_x+48, 2] = rendered_resized
            
            # Add character label at bottom
            char_label = f"'{char}' ({char_code})"
            # Note: For simplicity, we skip text rendering here
            
            # Place in big image
            y_start = row * cell_size
            x_start = col * cell_size
            big_img[y_start:y_start+cell_size, x_start:x_start+cell_size] = cell_img
        
        # Save big PNG
        Path("outputs").mkdir(exist_ok=True)
        output_path = f"outputs/font_visualization_{Path(font_path).stem}.png"
        big_pil = Image.fromarray(big_img)
        big_pil.save(output_path, dpi=(150, 150))
        
        print(f"✓ Saved visualization to {output_path}")
        print(f"  - Size: {img_width}x{img_height} pixels")
        print(f"  - Grid: {grid_rows}x{grid_cols} characters")
        print(f"  - Each cell: original (left) vs line segments (right)")
        
        return True
        
    except Exception as e:
        print(f"✗ Visualization creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate visualization for a single font using trained model")
    parser.add_argument("--font-path", required=True, help="Path to TTF/OTF font file")
    
    args = parser.parse_args()
    
    # Check requirements
    if not check_requirements(args.font_path):
        sys.exit(1)
    
    print(f"Running single font pipeline for: {args.font_path}")
    print(f"Font name: {Path(args.font_path).stem}")
    
    start_time = time.time()
    
    # Step 1: Render font characters in memory
    rendered_chars = render_font_characters(args.font_path)
    if not rendered_chars:
        print("✗ No characters could be rendered")
        sys.exit(1)
    
    # Step 2: Generate line segments using trained model
    font_data = generate_line_segments(rendered_chars)
    
    # Step 3: Create visualization
    if not create_visualization(font_data, rendered_chars, args.font_path):
        print("✗ Pipeline failed at visualization step")
        sys.exit(1)
    
    # Success!
    elapsed = time.time() - start_time
    print("=" * 60)
    print("🎉 PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print(f"Total time: {elapsed:.1f} seconds")
    print(f"Characters processed: {len(rendered_chars)}")
    print()
    print("Output files:")
    output_path = f"outputs/font_visualization_{Path(args.font_path).stem}.png"
    if Path(output_path).exists():
        print(f"  - {output_path}")


if __name__ == "__main__":
    main()