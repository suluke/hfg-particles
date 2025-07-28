# ML Font Inference

Machine learning pipeline for generating line segment approximations of font glyphs for the HFG Particles project.

## Overview

This project trains a CNN to predict 16 line segments that approximate the shape of rendered font characters. The output is designed to integrate with the `letters.ts` particle effect, replacing hardcoded line segment data with ML-generated approximations.

## Quick Start

### Option 1: Using Conda (Recommended)

```bash
# Complete setup (creates environment and shows next steps)
make setup

# Activate environment
conda activate ml-font-inference

# Quick start with small dataset
make data-small && make train-fast && make export
```

### Option 2: Using pip

```bash
# Install dependencies
pip install -r requirements.txt

# Generate training data from fonts
python src/dataset.py --render-fonts --max-fonts 20

# Train the model
python src/train.py --epochs 50 --batch-size 32

# Export for web integration
python src/export.py --model checkpoints/best.pth --visualize A B C
```

### Development Commands

```bash
make help          # Show all available commands
make data          # Generate full training dataset
make train         # Train with default settings
make clean         # Clean generated files
```

## Project Structure

- `src/` - Source code
  - `dataset.py` - Font rendering and data loading
  - `model.py` - CNN architectures
  - `renderer.py` - Differentiable line renderer
  - `train.py` - Training pipeline
  - `export.py` - Web integration export
- `data/` - Datasets and fonts
- `checkpoints/` - Model checkpoints
- `outputs/` - Training outputs and exports

## Integration

The trained model exports data compatible with `letters.ts`:
- 16 line segments per character (vs original 8)
- Coordinates in [-0.5, 0.5] range
- Uint8Array format for GPU texture loading

See `outputs/letters_ts_integration.patch` for integration instructions.

## Technical Details

- **Input**: 48×48 grayscale glyph bitmaps
- **Output**: 16 line segments as [x1,y1,x2,y2] coordinates
- **Architecture**: CNN encoder → FC decoder with Tanh activation
- **Training**: Differentiable rendering loss + regularization
- **Coordinate System**: (-0.5,-0.5) bottom-left, (0.5,0.5) top-right

For complete specifications see [CLAUDE.md](CLAUDE.md).