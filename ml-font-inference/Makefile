# ML Font Inference Makefile
# Provides convenient commands for development workflow

.PHONY: help env install clean data train export test lint format

# Default target
help:
	@echo "ML Font Inference Development Commands"
	@echo "======================================"
	@echo ""
	@echo "Environment Setup:"
	@echo "  setup       Complete development environment setup (recommended)"
	@echo "  install     Update dependencies in existing environment"
	@echo ""
	@echo "Data Pipeline:"
	@echo "  data        Generate training dataset from fonts"
	@echo "  data-small  Generate small dataset for testing (10 fonts)"
	@echo ""
	@echo "Training (SAFE - always resumes from checkpoints):"
	@echo "  train       Train model (auto-resumes if checkpoint exists)"
	@echo "  train-fast  Quick training run (auto-resumes)"
	@echo "  train-cpu   CPU-optimized training (auto-resumes)"
	@echo "  resume      Manual resume (legacy - use 'train' instead)"
	@echo "  train-fresh DANGEROUS: Start fresh (requires confirmation)"
	@echo ""
	@echo "Export:"
	@echo "  export      Export trained model for web integration"
	@echo "  visualize   Generate character visualizations"
	@echo ""
	@echo "Development:"
	@echo "  test        Run tests and validate setup"
	@echo "  lint        Check code style"
	@echo "  format      Auto-format code"
	@echo "  clean       Clean generated files"
	@echo ""

# Environment setup
setup:
	@echo "Setting up development environment..."
	@./scripts/setup_dev.sh

install:
	@echo "Updating conda environment..."
	conda env update -f environment.yml
	@echo "Dependencies updated!"

# Data generation
data:
	@echo "Generating full training dataset..."
	python src/dataset.py --render-fonts --max-fonts 200 --samples-per-glyph 3 --balanced-weights --output-dir data/processed

data-small:
	@echo "Generating small dataset for testing..."
	python src/dataset.py --render-fonts --max-fonts 10 --samples-per-glyph 2 --output-dir data/processed

# Training (SAFE: always resumes from existing checkpoints)
train:
	@echo "Checking for existing checkpoints..."
	@if [ -f checkpoints/latest.pth ]; then \
		echo "Found existing checkpoint, resuming training..."; \
		python src/train.py --resume checkpoints/latest.pth --epochs 100; \
	else \
		echo "No checkpoint found, starting fresh training..."; \
		python src/train.py --epochs 200 --batch-size 32 --data-dir data/processed; \
	fi

train-fast:
	@echo "Fast training (checking for checkpoints)..."
	@if [ -f checkpoints/latest.pth ]; then \
		echo "Found existing checkpoint, resuming for 10 more epochs..."; \
		python src/train.py --resume checkpoints/latest.pth --epochs 10; \
	else \
		echo "No checkpoint found, starting fast training..."; \
		python src/train.py --epochs 10 --batch-size 8 --data-dir data/processed; \
	fi

train-cpu:
	@echo "CPU training (checking for checkpoints)..."
	@if [ -f checkpoints/latest.pth ]; then \
		echo "Found existing checkpoint, resuming CPU training..."; \
		python src/train.py --resume checkpoints/latest.pth --epochs 50; \
	else \
		echo "No checkpoint found, starting CPU training..."; \
		python src/train.py --epochs 200 --batch-size 4 --data-dir data/processed; \
	fi

# Manual resume (legacy - use 'train' instead)
resume:
	@echo "Resuming training from latest checkpoint..."
	python src/train.py --resume checkpoints/latest.pth --epochs 50

# DANGEROUS: Start completely fresh training (overwrites existing progress)
train-fresh:
	@echo "WARNING: This will start fresh training and ignore existing checkpoints!"
	@echo "Are you sure? This will overwrite any existing progress."
	@echo "Use 'make clean' first if you want to delete checkpoints."
	@read -p "Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ]
	python src/train.py --epochs 200 --batch-size 32 --data-dir data/processed

# Export and visualization
export:
	@echo "Exporting trained model..."
	python src/export.py --model checkpoints/best.pth --output outputs/font_data.js --format both

visualize:
	@echo "Generating visualizations..."
	python src/export.py --model checkpoints/best.pth --visualize A B C D E F G H I J K L M N O P Q R S T U V W X Y Z

# Development tools
test:
	@echo "Running tests and validation..."
	python src/model.py  # Test model creation
	python src/renderer.py  # Test renderer
	@echo "Basic tests completed!"

lint:
	@echo "Checking code style..."
	@if command -v flake8 >/dev/null 2>&1; then \
		flake8 src/ --max-line-length=100 --ignore=E203,W503; \
	else \
		echo "flake8 not installed, skipping lint check"; \
	fi

format:
	@echo "Formatting code..."
	@if command -v black >/dev/null 2>&1; then \
		black src/ --line-length=100; \
	else \
		echo "black not installed, skipping formatting"; \
	fi

# Cleanup
clean:
	@echo "Cleaning generated files..."
	rm -rf data/rendered/*.npz
	rm -rf data/processed/*.npz
	rm -rf outputs/tensorboard/*
	rm -rf outputs/*.png
	rm -rf outputs/*.jpg
	rm -rf checkpoints/*.pth
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	@echo "Cleanup completed!"

# Check if conda environment is activated
check-env:
	@if [ "$(CONDA_DEFAULT_ENV)" != "ml-font-inference" ]; then \
		echo "Warning: ml-font-inference conda environment not activated"; \
		echo "Run: conda activate ml-font-inference"; \
		exit 1; \
	fi