#!/bin/bash
# Development environment setup script

set -e

echo "ML Font Inference - Development Setup"
echo "====================================="

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "Error: conda is not installed or not in PATH"
    echo "Please install Miniconda or Anaconda first"
    exit 1
fi

# Check if environment already exists
if conda env list | grep -q "ml-font-inference"; then
    echo "Environment 'ml-font-inference' already exists."
    echo "To update dependencies, run: make install"
    echo "To recreate from scratch, first remove it: conda env remove -n ml-font-inference"
    exit 0
fi

# Create conda environment
echo "Creating conda environment..."
conda env create -f environment.yml

echo ""
echo "Environment created successfully!"
echo ""
echo "🚀 Next Steps:"
echo "1. Activate the environment:"
echo "   conda activate ml-font-inference"
echo ""
echo "2. Quick start with small dataset:"
echo "   make data-small && make train-fast"
echo ""
echo "📖 Available commands:"
echo "   make help        # Show all available commands"
echo "   make data        # Generate full training dataset"
echo "   make train       # Train the model"
echo "   make export      # Export for web integration"
echo "   make clean       # Clean generated files"