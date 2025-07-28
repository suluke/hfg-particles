"""
Export trained model for integration with letters.ts particle effect.
"""

import argparse
import json
from pathlib import Path
from typing import List, Dict, Optional

import torch
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
from tqdm import tqdm

from model import create_model
from dataset import FontRenderer
from renderer import DifferentiableLineRenderer, visualize_rendering


class FontExporter:
    """Export trained model predictions for letters.ts integration."""
    
    def __init__(self, model_path: str, device: str = 'cpu'):
        self.device = torch.device(device)
        self.model_path = model_path
        self.model = None
        self.renderer = DifferentiableLineRenderer()
        
        # ASCII printable characters (32-126)
        self.ascii_chars = list(range(32, 127))
        
    def load_model(self):
        """Load the trained model."""
        checkpoint = torch.load(self.model_path, map_location=self.device)
        config = checkpoint['config']
        
        # Create model with same configuration
        self.model = create_model(
            model_type=config['model_type'],
            num_segments=config['num_segments'],
            input_size=config['input_size']
        ).to(self.device)
        
        # Load weights
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()
        
        print(f"Loaded model from {self.model_path}")
        print(f"Model type: {config['model_type']}")
        print(f"Number of segments: {config['num_segments']}")
        
    def generate_font_data(self, font_paths: List[str], output_font: str = "default") -> np.ndarray:
        """Generate line segment data for all ASCII characters using the trained model."""
        if self.model is None:
            self.load_model()
        
        # Initialize font renderer
        font_renderer = FontRenderer(image_size=48)
        
        # Storage for line segments: 256 characters × 16 segments × 4 coordinates
        font_data = np.zeros((256, 16, 4), dtype=np.float32)
        
        with torch.no_grad():
            for char_code in tqdm(self.ascii_chars, desc="Generating line segments"):
                char = chr(char_code)
                
                # Try to render character with available fonts
                rendered_char = None
                for font_path in font_paths:
                    rendered_char = font_renderer.render_character(char, font_path)
                    if rendered_char is not None:
                        break
                
                if rendered_char is None:
                    print(f"Warning: Could not render character '{char}' (code {char_code})")
                    continue
                
                # Prepare input tensor
                input_tensor = torch.from_numpy(rendered_char).float().unsqueeze(0).unsqueeze(0) / 255.0
                input_tensor = input_tensor.to(self.device)
                
                # Generate line segments
                predicted_segments = self.model(input_tensor)  # Shape: (1, num_segments, 4)
                segments = predicted_segments[0].cpu().numpy()  # Shape: (num_segments, 4)
                
                # Store in font data array
                font_data[char_code] = segments
        
        return font_data
    
    def export_to_uint8_array(self, font_data: np.ndarray) -> np.ndarray:
        """Convert font data to Uint8Array format compatible with letters.ts."""
        # Current letters.ts format:
        # - MAX_LINES_PER_LETTER = 8 (we're using 16)
        # - ELMTS_PER_LINE = 4 (x1, y1, x2, y2)
        # - Coordinates in [-0.5, 0.5] range
        # - Stored as (coord + 0.5) * 255 in Uint8Array
        
        # We need to update the constants in letters.ts to use 16 segments
        MAX_LINES_PER_LETTER = 16
        ELMTS_PER_LINE = 4
        NUM_LETTERS = 256
        
        # Create output array
        output_size = NUM_LETTERS * MAX_LINES_PER_LETTER * ELMTS_PER_LINE
        uint8_data = np.zeros(output_size, dtype=np.uint8)
        
        for char_code in range(NUM_LETTERS):
            offset = MAX_LINES_PER_LETTER * ELMTS_PER_LINE * char_code
            
            # Get line segments for this character
            segments = font_data[char_code]  # Shape: (16, 4)
            
            # Convert coordinates from [-0.5, 0.5] to [0, 255]
            segments_uint8 = np.round((segments + 0.5) * 255).astype(np.uint8)
            
            # Flatten and store
            segments_flat = segments_uint8.flatten()
            uint8_data[offset:offset + len(segments_flat)] = segments_flat
        
        return uint8_data
    
    def export_to_javascript(self, uint8_data: np.ndarray, output_path: str):
        """Export data as JavaScript file for web integration."""
        with open(output_path, 'w') as f:
            f.write("// Generated font data for letters.ts particle effect\n")
            f.write("// This file was auto-generated by ml-font-inference export.py\n\n")
            
            f.write("const MAX_LINES_PER_LETTER = 16;\n")
            f.write("const ELMTS_PER_LINE = 4;\n")
            f.write("const NUM_LETTERS = 256;\n\n")
            
            f.write("// Font line segment data as Uint8Array\n")
            f.write("const GeneratedFontData = new Uint8Array([\n")
            
            # Write data in chunks for readability
            chunk_size = 16
            for i in range(0, len(uint8_data), chunk_size):
                chunk = uint8_data[i:i + chunk_size]
                chunk_str = ', '.join(f'{x:3d}' for x in chunk)
                f.write(f"  {chunk_str},\n")
            
            f.write("]);\n\n")
            
            f.write("// Export for use in letters.ts\n")
            f.write("export { GeneratedFontData, MAX_LINES_PER_LETTER, ELMTS_PER_LINE, NUM_LETTERS };\n")
    
    def export_to_binary(self, uint8_data: np.ndarray, output_path: str):
        """Export data as binary file."""
        uint8_data.tofile(output_path)
        print(f"Exported binary font data to {output_path}")
    
    def visualize_character(self, char: str, font_data: np.ndarray, save_path: Optional[str] = None):
        """Visualize line segments for a specific character."""
        char_code = ord(char)
        if char_code >= 256:
            print(f"Character '{char}' is outside ASCII range")
            return
        
        # Get line segments for character
        segments = font_data[char_code]  # Shape: (16, 4)
        
        # Convert to tensor for visualization
        segments_tensor = torch.from_numpy(segments).unsqueeze(0)  # Shape: (1, 16, 4)
        
        # Visualize
        if save_path:
            save_path = save_path.replace('{char}', char).replace('{code}', str(char_code))
        
        visualize_rendering(segments_tensor, save_path=save_path)
        
        print(f"Character '{char}' visualization saved to {save_path}")
        print(f"Line segments for '{char}':")
        for i, seg in enumerate(segments):
            if np.abs(seg).max() > 0.01:  # Only show non-trivial segments
                print(f"  Line {i:2d}: ({seg[0]:+.3f}, {seg[1]:+.3f}) -> ({seg[2]:+.3f}, {seg[3]:+.3f})")
    
    def create_letters_ts_patch(self, output_path: str):
        """Create a patch file showing how to integrate with letters.ts."""
        patch_content = '''
// Patch for letters.ts to use ML-generated font data
// Apply these changes to js/effects/letters.ts

// 1. Update constants at the top of the file:
const MAX_LINES_PER_LETTER = 16;  // Changed from 8 to 16
const NUM_LETTERS = 256;
const ELMTS_PER_LINE = 4;

// 2. Import the generated font data:
import { GeneratedFontData } from '../ml-font-inference/outputs/font_data.js';

// 3. Replace the CreateFontData function with:
function CreateFontData() {
  return GeneratedFontData;
}

// 4. Update the fragment shader to handle 16 line segments:
// In the getLetterOpacity function, change the loop limit:
for (float i = 0.; i < 16.; i += 1.) {  // Changed from 8 to 16
  vec4 line = texture2D(${linesUniform}, vec2((i + begin + .5) / ${linesLenUniform}, .5));
  dist = min(dist, pointToLineDist(coord, line.xy - .5, line.zw - .5));
}

// 5. Update the texture creation to handle the new size:
const numLetterLines = NUM_LETTERS * MAX_LINES_PER_LETTER; // Now 256 * 16 = 4096
'''
        
        with open(output_path, 'w') as f:
            f.write(patch_content)
        
        print(f"Created integration patch at {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Export trained model for letters.ts integration')
    parser.add_argument('--model', type=str, required=True, help='Path to trained model checkpoint')
    parser.add_argument('--output', type=str, default='outputs/font_data.js', help='Output file path')
    parser.add_argument('--format', type=str, choices=['js', 'binary', 'both'], default='js',
                       help='Export format')
    parser.add_argument('--visualize', type=str, nargs='*', default=[],
                       help='Characters to visualize (e.g., A B C)')
    parser.add_argument('--device', type=str, default='cpu', help='Device to use for inference')
    
    args = parser.parse_args()
    
    # Create exporter
    exporter = FontExporter(args.model, args.device)
    
    # Get available fonts
    font_renderer = FontRenderer()
    font_paths = font_renderer.get_available_fonts()
    
    if not font_paths:
        print("No fonts found on system")
        return
    
    print(f"Using {len(font_paths)} fonts for character generation")
    
    # Generate font data
    print("Generating line segments for all ASCII characters...")
    font_data = exporter.generate_font_data(font_paths[:10])  # Use first 10 fonts
    
    # Convert to export format
    uint8_data = exporter.export_to_uint8_array(font_data)
    
    # Export in requested format(s)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    if args.format in ['js', 'both']:
        js_path = output_path.with_suffix('.js')
        exporter.export_to_javascript(uint8_data, str(js_path))
        print(f"Exported JavaScript data to {js_path}")
    
    if args.format in ['binary', 'both']:
        bin_path = output_path.with_suffix('.bin')
        exporter.export_to_binary(uint8_data, str(bin_path))
    
    # Create integration patch
    patch_path = output_path.parent / 'letters_ts_integration.patch'
    exporter.create_letters_ts_patch(str(patch_path))
    
    # Visualize requested characters
    if args.visualize:
        vis_dir = output_path.parent / 'visualizations'
        vis_dir.mkdir(exist_ok=True)
        
        for char in args.visualize:
            if len(char) == 1:
                save_path = str(vis_dir / f'char_{char}_{ord(char):03d}.png')
                exporter.visualize_character(char, font_data, save_path)
    
    print("Export completed!")
    print(f"To integrate with letters.ts:")
    print(f"1. Copy {output_path} to your web project")
    print(f"2. Apply changes from {patch_path}")
    print(f"3. Update MAX_LINES_PER_LETTER to 16 in letters.ts")


if __name__ == '__main__':
    main()