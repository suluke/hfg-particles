"""
CNN model for predicting line segments from font glyphs.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class FontLineSegmentCNN(nn.Module):
    """CNN model that predicts line segments from font glyph bitmaps."""
    
    def __init__(self, num_segments: int = 16, input_size: int = 48, adaptive_line_width: bool = True):
        super().__init__()
        self.num_segments = num_segments
        self.input_size = input_size
        self.adaptive_line_width = adaptive_line_width
        self.predict_line_width = adaptive_line_width  # For compatibility with forward()
        
        # Output size: coordinates + optional line width
        coord_size = num_segments * 4  # x1, y1, x2, y2 for each segment
        width_size = 1 if adaptive_line_width else 0
        self.output_size = coord_size + width_size
        
        # CNN Encoder
        self.encoder = nn.Sequential(
            # First conv block: 48x48 -> 24x24
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            
            # Second conv block: 24x24 -> 12x12
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            
            # Third conv block: 12x12 -> 6x6
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            
            # Fourth conv block: 6x6 -> 3x3
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
        )
        
        # Global average pooling
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        
        # Fully connected decoder - increased capacity for adaptive line width task
        self.decoder = nn.Sequential(
            nn.Linear(256, 1024),  # Increased capacity
            nn.ReLU(inplace=True),
            nn.Dropout(0.1),
            
            nn.Linear(1024, 512),  # Increased capacity
            nn.ReLU(inplace=True),
            nn.Dropout(0.05),  # Light dropout
            
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            
            nn.Linear(256, self.output_size),
            # No final activation - let the model learn the full range
        )
        
        # Initialize weights
        self._initialize_weights()
    
    def _initialize_weights(self):
        """Initialize model weights."""
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.xavier_normal_(m.weight)
                if m.bias is not None:
                    # Initialize final layer bias to encourage diverse line placements
                    if m == self.decoder[-1]:  # Final layer
                        nn.init.uniform_(m.bias, -0.1, 0.1)
                    else:
                        nn.init.constant_(m.bias, 0)
    
    def forward(self, x):
        """Forward pass through the network."""
        # Encoder: extract features
        features = self.encoder(x)
        
        # Global pooling: 256 x H x W -> 256 x 1 x 1
        pooled = self.global_pool(features)
        
        # Flatten: 256 x 1 x 1 -> 256
        flattened = pooled.view(pooled.size(0), -1)
        
        # Decoder: predict line segments (and optionally line width)
        decoder_output = self.decoder(flattened)
        
        if hasattr(self, 'predict_line_width') and self.predict_line_width:
            # Split output: 64 coords + 1 line width
            line_segments = decoder_output[:, :64]  # (batch_size, 64)
            line_width = decoder_output[:, 64:]      # (batch_size, 1)
            
            # Constrain coordinates to [-1, 1] first, then project to [-0.5, 0.5]
            line_segments = torch.tanh(line_segments) * 0.5
            
            # Project line width from (-1, 1) to (0.02, 0.12) range
            line_width = torch.sigmoid(line_width) * 0.1 + 0.02  # Range: [0.02, 0.12]
            
            # Reshape coordinates
            line_segments = line_segments.view(-1, self.num_segments, 4)
            
            return line_segments, line_width
        else:
            # Standard mode: just coordinates
            line_segments = decoder_output
            
            # Constrain coordinates to [-1, 1] first, then project to [-0.5, 0.5]
            line_segments = torch.tanh(line_segments) * 0.5
            
            # Reshape to (batch_size, num_segments, 4)
            line_segments = line_segments.view(-1, self.num_segments, 4)
            
            return line_segments
    
    def get_model_info(self):
        """Get model information."""
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)
        
        return {
            'total_parameters': total_params,
            'trainable_parameters': trainable_params,
            'model_size_mb': total_params * 4 / (1024 * 1024),  # Assuming float32
            'num_segments': self.num_segments,
            'output_size': self.output_size
        }


class ResNetBlock(nn.Module):
    """Residual block for improved feature learning."""
    
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, 
                              stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3,
                              stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1,
                         stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )
    
    def forward(self, x):
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        out = F.relu(out)
        return out


class FontLineSegmentResNet(nn.Module):
    """ResNet-based model for line segment prediction."""
    
    def __init__(self, num_segments: int = 16, input_size: int = 48):
        super().__init__()
        self.num_segments = num_segments
        self.output_size = num_segments * 4
        
        # Initial convolution
        self.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        
        # Residual layers
        self.layer1 = self._make_layer(64, 64, 2, stride=1)
        self.layer2 = self._make_layer(64, 128, 2, stride=2)
        self.layer3 = self._make_layer(128, 256, 2, stride=2)
        self.layer4 = self._make_layer(256, 512, 2, stride=2)
        
        # Global average pooling and classifier
        self.avgpool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(256, self.output_size),
            nn.Tanh()
        )
        
        self._initialize_weights()
    
    def _make_layer(self, in_channels, out_channels, blocks, stride):
        layers = []
        layers.append(ResNetBlock(in_channels, out_channels, stride))
        for _ in range(1, blocks):
            layers.append(ResNetBlock(out_channels, out_channels))
        return nn.Sequential(*layers)
    
    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                nn.init.constant_(m.bias, 0)
    
    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x)))
        x = self.maxpool(x)
        
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        
        x = self.avgpool(x)
        x = x.view(x.size(0), -1)
        x = self.fc(x)
        
        # Scale from [-1, 1] to [-0.5, 0.5]
        x = x * 0.5
        
        # Reshape to (batch_size, num_segments, 4)
        x = x.view(-1, self.num_segments, 4)
        
        return x


def create_model(model_type: str = 'cnn', num_segments: int = 16, input_size: int = 48, adaptive_line_width: bool = True):
    """Create a model instance."""
    if model_type.lower() == 'cnn':
        return FontLineSegmentCNN(num_segments, input_size, adaptive_line_width)
    elif model_type.lower() == 'resnet':
        return FontLineSegmentResNet(num_segments, input_size, adaptive_line_width)
    else:
        raise ValueError(f"Unknown model type: {model_type}")


def test_model():
    """Test model with dummy input."""
    model = create_model('cnn')
    dummy_input = torch.randn(4, 1, 48, 48)  # Batch of 4 images
    
    with torch.no_grad():
        output = model(dummy_input)
    
    print(f"Input shape: {dummy_input.shape}")
    print(f"Output shape: {output.shape}")
    print(f"Output range: [{output.min().item():.3f}, {output.max().item():.3f}]")
    
    # Print model info
    info = model.get_model_info()
    for key, value in info.items():
        print(f"{key}: {value}")


if __name__ == '__main__':
    test_model()