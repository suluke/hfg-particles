# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this subdirectory.

## Project Overview

This is a machine learning project for training a model to infer line segments approximating rendered font glyphs.
These line segments are designed to be usable by the `letters` particle effect implemented in this repo's `js/effects/letters.ts` file.

## Pipeline Overview

1. **Font Rendering**: TTF font glyphs in the visible ASCII range (32-126) are rendered to square bitmaps
2. **Model Training**: CNN model predicts a common line width and a fixed number of line segment coordinates from glyph bitmaps
3. **Differentiable Rendering**: Predicted line segments are rendered back to bitmaps for loss calculation
4. **Integration**: Trained model outputs are converted to the format expected by `letters.ts`

## Technical Specifications

### Data Format
- **Input**: 48x48 grayscale bitmaps (white background, black glyph)
- **Output**: 1 line width per glyph, where 1.0 means 48 pixels
   - **Line width range**: Reasonable values therefore range from ~0.02 (1 pixel) to 0.125 (6 pixels)
- **Output**: 16 line segments per glyph, format `[x1, y1, x2, y2]` normalized to [-0.5, 0.5] range
  - **Coordinate System**: (-0.5, -0.5) is bottom-left, (0.5, 0.5) is top-right
- **Character Set**: ASCII 32-126 (95 printable characters)
- **Fonts**: System fonts discovered via `matplotlib.font_manager` (200+ fonts by default)

### Dataset Generation & Augmentation
- **Font Selection**: 200 fonts by default with balanced weight distribution (light/regular/bold)
- **Multiple Variations**: 3 variations per glyph with diverse augmentations:
  - **Font Size Variation**: Random selection from [28, 32, 36, 40, 44] pixels per variation
  - **Position Augmentation**: ±2 pixel random offsets to break perfect centering
  - **Balanced Weights**: Equal representation of light, regular, and bold font weights
- **Training Augmentation**: Additional real-time transforms during training:
  - Small rotations (±3 degrees)
  - Slight scaling (95%-105%)
  - Light noise injection (5% probability)
- **Dataset Size**: ~57,000 samples (200 fonts × 95 chars × 3 variations)
- **Command**: `make data` generates full dataset with all augmentations enabled

### Model Architecture
- **Framework**: PyTorch  
- **Input Shape**: (1, 48, 48) - single channel 48x48 images
- **Output Shape**: (65,) - 16 line segments × 4 coordinates + 1 adaptive line width
- **Architecture**: CNN encoder → fully connected decoder
  - Conv2d layers with BatchNorm and ReLU
  - Global average pooling
  - FC layers to output 64 coordinates + 1 line width
- **Coordinate Mapping**: Linear projection from (-1,1) to (-0.5,0.5) range
- **Line Width Mapping**: Sigmoid projection to (0.02, 0.125) range for font weight adaptation
- **Initialization**: Xavier normal weights, diverse bias for final layer

### Training Configuration
- **Loss Function**: Relative background weighting with fixed emphasis ratios
  - **Foreground Weight**: 2.0x → modest emphasis on character structure
  - **Background Weight**: 1.0x → automatically scaled by relative content density per character
  - Weighted reconstruction with per-character adaptive background scaling
  - Dice coefficient: Measures foreground region overlap quality
  - Smart sparsity: Only penalize unused lines (length < 0.05)
  - Diversity regularization: Prevent overlapping line segments
- **Optimizer**: AdamW with ReduceLROnPlateau scheduling
- **Batch Size**: 32 (validated to work well)
- **Epochs**: 200 default, resumable training adds more epochs incrementally
- **Checkpointing**: Save model state every 10 epochs, resumable training

### Differentiable Rendering
- **Renderer**: Custom differentiable line renderer using PyTorch with Gaussian falloff
- **Line Width**: Adaptive per-character prediction in (0.02, 0.125) range
- **Anti-aliasing**: Gaussian distance-based smooth line rendering
  - **Sigma**: `line_width / 6.0` for sharp edges (avoid `/3.0` - too soft)
  - **Critical for negative space**: Steeper falloff prevents background artifacts
- **Color**: Black lines on white background (inverted intensity)
- **Output**: 48x48 grayscale images matching input format

## Directory Structure

```
ml-font-inference/
├── src/
│   ├── model.py          # CNN model definition
│   ├── dataset.py        # Font rendering and data loading
│   ├── renderer.py       # Differentiable line renderer
│   ├── train.py          # Training loop and checkpointing
│   └── export.py         # Model export for letters.ts integration
├── data/
│   ├── rendered/        # Generated glyph bitmaps
│   └── processed/       # Preprocessed training data
├── checkpoints/         # Model checkpoints
├── outputs/            # Training outputs and visualizations
└── requirements.txt    # Python dependencies
```

## Integration with letters.ts

### Current Format Analysis
The existing `letters.ts` uses hardcoded line segments stored as:
- `MAX_LINES_PER_LETTER = 8` (we'll use 16 for more detail)
- `ELMTS_PER_LINE = 4` (x1, y1, x2, y2)
- Coordinates normalized to [-0.5, 0.5] range
- Stored in Uint8Array as `(coord + 0.5) * 255`

### Export Requirements
- **Output Format**: Uint8Array compatible with existing texture loading
- **Coordinate Range**: [-0.5, 0.5] normalized coordinates
- **Storage**: 16 lines × 4 elements × 256 characters = 16,384 bytes
- **Integration**: Replace `CreateFontData()` function with ML-generated data

## Development Commands

```bash
# Claude needs to activate conda in its internal shell for every command involving python/pip
source /opt/miniconda3/etc/profile.d/conda.sh && conda activate ml-font-inference
# Setup environment (conda recommended)
conda create -n ml-font-inference python=3.10
conda activate ml-font-inference
pip install -r requirements.txt

# OR using Makefile
make env         # Create conda environment
make data        # Prepare dataset  

# SAFE TRAINING (always resumes from existing checkpoints)
make train       # Auto-resumes if checkpoint exists, otherwise starts fresh
make train-cpu   # CPU-optimized version
make train-fast  # Quick 10-epoch run for testing

# DANGER ZONE (only if you want to lose progress)
make clean       # Delete ALL progress
make train-fresh # Start fresh training (requires confirmation)

# Manual dataset generation commands
python src/dataset.py --render-fonts --max-fonts 200 --samples-per-glyph 3 --balanced-weights
python src/dataset.py --render-fonts --max-fonts 50 --samples-per-glyph 2  # Smaller dataset for testing

# Manual training commands
python src/train.py --epochs 200
python src/train.py --resume checkpoints/latest.pth --epochs 50  # Train 50 MORE epochs
python src/export.py --model checkpoints/best.pth --output font_data.js
```

## Key Dependencies

```
torch>=2.0.0
torchvision>=0.15.0
Pillow>=9.0.0
numpy>=1.21.0
fonttools>=4.38.0
matplotlib>=3.6.0
tqdm>=4.64.0
```

## Validation & Testing

### Metrics
- **Reconstruction Loss**: MSE between rendered predictions and targets
- **Visual Quality**: Human evaluation of glyph recognizability  
- **Integration Test**: Verify exported data works in particle system
- **Target Performance**: Validation loss < 0.1 (achieved: 0.090)

### Test Cases
- Render sample characters with trained model
- Compare visual quality against hardcoded letters
- Verify coordinate ranges and format compatibility
- Test with various font styles and weights

## Implementation Lessons Learned

### Critical Design Decisions
1. **Coordinate Projection vs Clamping**: Use linear projection (`output * 0.5`) instead of clamping for better gradient flow and model capacity utilization
2. **Smart Sparsity Loss**: Only penalize unused lines (length < 0.05) rather than encouraging all lines to be short
3. **Line Width Tuning**: 0.05 coordinate units optimal for 48x48 images (visible but not overwhelming)
4. **Color Inversion**: Ensure black lines on white background matches input format
5. **Resumable Training**: `--epochs N` with `--resume` trains for N additional epochs, not until epoch N

### Training Stability
- **Validation Loss**: Target < 0.1, achieved 0.090 at epoch 69
- **Learning Rate**: 5e-4 with ReduceLROnPlateau works well
  - **Auto-restart**: When LR drops below 1e-6, restart at 10% of original to escape local minima
- **Regularization**: Smart sparsity + diversity loss prevents degenerate solutions
- **Visualization**: Output every 10 epochs to monitor progress without overwhelming disk
- **Checkpoint Safety**: All `make train*` commands auto-resume from existing checkpoints
- **Long Training**: Model continues improving beyond epoch 400 with proper LR management

### Common Pitfalls Avoided
- Using random dummy targets instead of differentiable rendering
- **Simple MSE loss dominated by background pixels** - for sparse characters like "!", MSE gives misleadingly good scores when model predicts all white
- Too large line width overwhelming the image
- Clamping outputs instead of projection
- Training on white lines on black background
- Model outputs near zero due to poor initialization
- **Learning rate decay to near-zero** - model gets stuck in local minima when LR drops below ~1e-6
- **Soft anti-aliasing creating artifacts** - too-gentle Gaussian falloff causes background contamination
- **No negative space constraint** - model not penalized for artifacts in areas that should be pure white
- **Unconstrained decoder outputs** - without activation functions, decoder can output arbitrarily large values causing coordinates outside valid range

### Loss Function Evolution
**Problem**: Simple MSE between rendered and target images fails for sparse characters:
- Character "!" has ~90% white pixels, ~10% black pixels
- Model predicting all white gets ~0.01 MSE (looks excellent but completely wrong)

**Solution**: Relative background weighting with fixed ratios:
- **Weighted MSE**: Fixed foreground/background weights with per-character density scaling
- **Dice coefficient**: Measures actual shape overlap (penalizes missing character parts)
- Combined: `weighted_mse + 0.5 * dice_loss`

### Critical Insight: Relative vs Absolute Pixel Weighting
**Problem**: Background loss dominated by absolute pixel counts regardless of weighting:
- Character "!" (5% FG, 95% BG): Even with `fg_weight=10, bg_weight=1`, background contributes 65% of total loss
- Character "W" (40% FG, 60% BG): Background contributes 38% of total loss
- **Result**: Learning dynamics fundamentally different across characters

**Root Cause**: Traditional weighting `loss = fg_pixels * fg_weight + bg_pixels * bg_weight` still biases toward abundant pixel type

**Solution**: Relative background weighting normalized by content density:
```python
# Calculate foreground density per sample
fg_ratio = torch.mean(target_fg > 0.5)  # % foreground pixels
relative_bg_weight = bg_weight * (fg_ratio / (1 - fg_ratio + 1e-6))

# For "!" (5% FG): bg_weight * (0.05/0.95) = bg_weight * 0.053  (reduced)
# For "W" (40% FG): bg_weight * (0.40/0.60) = bg_weight * 0.67   (normal)
```

**Impact**: Consistent learning dynamics across all character types - sparse and dense characters receive equivalent semantic emphasis rather than pixel-count-driven bias.

### Simplified Loss Weighting Strategy
**Fixed Weights with Relative Scaling**: Simple, principled approach without temporal complexity

**Fixed Ratio Configuration**:
- Foreground weight: 2.0x → modest emphasis on character structure
- Background weight: 1.0x → automatically scaled by relative content density per character

**Per-Character Automatic Adjustment**:
- Sparse characters ("!", ".", ","): Background weight reduced to ~0.05x
- Dense characters ("W", "M", "#"): Background weight maintained at ~0.67x  
- **Result**: Consistent learning dynamics across all character types

**Implementation**: Fixed weights logged in training output: `Weights: FG=2.0/BG=1.0`

**Benefits vs Curriculum Learning**:
- ✅ **Simpler**: No epoch-based strategies or complex transitions
- ✅ **More principled**: Addresses mathematical root cause of pixel abundance bias
- ✅ **Automatic**: Adapts per-character without manual tuning
- ✅ **Consistent**: Same learning dynamics across all character types

### Advanced Training Issues & Solutions

#### Problem: Converged Model with Artifacts (Epoch 400+)
**Symptoms**:
- Learning rate decayed to ~1e-8 (no learning happening)
- Character structure correct but artifacts in negative space
- Example: '=' character has black pixels between the bars instead of clean white space

**Root Causes**:
1. **Learning rate too low**: Model stuck in local minimum
2. **Soft anti-aliasing**: Gaussian falloff too gentle (`sigma = line_width/3.0`)
3. **No negative space penalty**: Model not encouraged to keep background areas pure white

**Solutions Applied**:
```python
# 1. Learning Rate Restart
if current_lr < 1e-6:
    new_lr = original_lr * 0.1  # Restart at 10% of original
    
# 2. Steeper Anti-aliasing + Wider Lines
sigma = line_width / 6.0  # Tighter falloff (was /3.0)
line_width = 0.06        # Increased from 0.05 to compensate

# 3. Negative Space Regularization
def negative_space_regularization(rendered, target):
    target_bg = target > 0.8  # Pure white regions
    rendered_in_bg = rendered[target_bg]
    return torch.mean((1.0 - rendered_in_bg) ** 2)
    
# Combined loss: weighted_mse + 0.5*dice + 0.1*negative_space
```

**Key Insight**: Even well-converged models can be improved by:
- Identifying specific failure modes (artifacts in negative space)
- Adding targeted regularization terms
- Restarting learning when stuck in local minima

#### Problem: Complex Characters with Poor Intersections (e.g., '#')
**Symptoms**:
- Character structure partially correct but wrong proportions
- Example: '#' renders as "mirrored 9" with 3 short horizontal lines instead of 2 full-width
- Missing or poor line intersections
- Lines too short for character requirements

**Root Causes**:
1. **No intersection learning**: Model doesn't understand lines should intersect
2. **Length threshold too strict**: 0.05 threshold penalizes longer lines needed for complex characters
3. **No geometric structure rewards**: Model not encouraged to form proper intersections

**Solutions Applied**:
```python
# 1. Intersection Bonus - reward lines that intersect
def intersection_bonus(line_segments):
    for each_pair_of_lines:
        intersection_dist = line_intersection_distance(line1, line2)
        if intersection_dist < 0.05:  # Close intersection
            bonus += 1.0
            
# 2. Relaxed Length Threshold
length_threshold = 0.03  # Reduced from 0.05 to allow longer lines

# 3. Integration into loss
diversity_loss = diversity_loss - 0.1*orientation_bonus - 0.05*intersection_bonus
```

**Impact**: Characters like '#', '+', '*' should show better proportions and proper intersections

#### Problem: Font Weight vs Line Width Mismatch
**Symptoms**:
- Training with multiple font weights (thin, regular, bold) but fixed line width
- Model struggles to learn consistent stroke representation
- Bold fonts under-represented, thin fonts over-thick

**Root Cause**:
- Input: Variable stroke thickness (thin=0.02, regular=0.05, bold=0.08+)  
- Output: Fixed line width (0.07) for all characters
- Creates inconsistent learning targets

**Solutions Available**:
```python
# Option 1: Filter by font weight (immediate)
'font_weight_filter': 'regular'  # Only train on consistent weight

# Option 2: Adaptive line width (future)
'adaptive_line_width': True      # Model predicts per-character line width
# Model output: 64 coords + 1 line_width in range [0.02, 0.12]
```

**Implemented Solution**: Adaptive line width architecture
```python
# Model now predicts per-character line width
model_output = model(images)
line_segments, line_widths = model_output  # 64 coords + 1 width

# Renderer uses predicted widths
rendered = renderer(line_segments, line_widths)

# Line width range: sigmoid(output) * 0.1 + 0.02 → [0.02, 0.12]
```

**Benefits**: 
- ✅ Handles all font weights (thin, regular, bold) consistently
- ✅ Model learns appropriate stroke thickness per character
- ✅ Better reconstruction quality across diverse fonts
- ✅ More realistic line segment representation

#### Problem: Black Rendered Images (Coordinate Range Issue)
**Symptoms**:
- Model predictions render as completely black images
- Training appears to proceed normally with reasonable loss values
- Debug output shows line segments with extreme coordinates (e.g., -2.96 to 2.53)

**Root Cause**:
- Decoder outputs unbounded values without activation functions
- Coordinate projection `output * 0.5` assumes input is in [-1, 1] range
- With random initialization, decoder can output arbitrarily large values
- Results in line segments completely outside visible area [-0.5, 0.5]

**Solution Applied**:
```python
# Before (broken): Direct projection without constraint
line_segments = decoder_output * 0.5  # Can be huge if decoder_output is large

# After (fixed): Constrain first, then project
line_segments = torch.tanh(decoder_output) * 0.5  # Always in [-0.5, 0.5]
```

**Key Insight**: Even basic coordinate bounds require explicit enforcement in neural networks. The tanh activation ensures coordinates stay within the expected range regardless of model initialization or training state.

## Safety Patterns

### Checkpoint Protection
**NEVER accidentally overwrite training progress:**

1. **Safe Commands (DEFAULT)**: All `make train*` commands check for existing checkpoints and auto-resume
   ```bash
   make train      # Resumes if checkpoint exists, otherwise starts fresh
   make train-cpu  # Same safety for CPU training
   ```

2. **Explicit Cleanup**: Only delete progress when you really want to
   ```bash
   make clean      # Explicitly delete all checkpoints and outputs
   make train-fresh # Start fresh training (requires "yes" confirmation)
   ```

3. **Manual Resume**: Always specify additional epochs, not absolute epochs
   ```bash
   python src/train.py --resume checkpoints/latest.pth --epochs 50  # Train 50 MORE
   ```

### Why This Matters
- Training can take hours/days - losing progress is devastating
- Checkpoints contain model state, optimizer state, and training history
- Default behavior should be safe; dangerous operations should be explicit