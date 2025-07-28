"""
Differentiable line renderer for training line segment prediction models.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from typing import Tuple, Optional


class DifferentiableLineRenderer(nn.Module):
    """Differentiable renderer for line segments."""
    
    def __init__(self, image_size: int = 48, line_width: float = 0.05, anti_alias: bool = True):
        super().__init__()
        self.image_size = image_size
        self.line_width = line_width
        self.anti_alias = anti_alias
        
        # Create coordinate grids
        self.register_buffer('x_coords', self._create_coord_grid()[0])
        self.register_buffer('y_coords', self._create_coord_grid()[1])
    
    def _create_coord_grid(self) -> Tuple[torch.Tensor, torch.Tensor]:
        """Create coordinate grids for the image."""
        # Create coordinates in [-0.5, 0.5] range to match our coordinate system
        coords = torch.linspace(-0.5, 0.5, self.image_size)
        y_coords, x_coords = torch.meshgrid(coords, coords, indexing='ij')
        
        # Note: y_coords[0, :] corresponds to top of image (y = 0.5)
        # y_coords[-1, :] corresponds to bottom of image (y = -0.5)
        # We need to flip y to match our coordinate system where (-0.5, -0.5) is bottom-left
        y_coords = torch.flip(y_coords, [0])
        
        return x_coords, y_coords
    
    def point_to_line_distance(self, points: torch.Tensor, line_start: torch.Tensor, 
                              line_end: torch.Tensor) -> torch.Tensor:
        """
        Calculate distance from points to line segments.
        
        Args:
            points: Shape (H, W, 2) - grid of 2D points
            line_start: Shape (batch_size, num_lines, 2) - line start points  
            line_end: Shape (batch_size, num_lines, 2) - line end points
            
        Returns:
            distances: Shape (batch_size, num_lines, H, W) - distance from each pixel to each line
        """
        batch_size, num_lines = line_start.shape[:2]
        H, W = points.shape[:2]
        
        # Expand dimensions for broadcasting
        # points: (1, 1, H, W, 2)
        # line_start: (batch_size, num_lines, 1, 1, 2)  
        # line_end: (batch_size, num_lines, 1, 1, 2)
        points = points.unsqueeze(0).unsqueeze(0)  # (1, 1, H, W, 2)
        line_start = line_start.unsqueeze(2).unsqueeze(3)  # (batch_size, num_lines, 1, 1, 2)
        line_end = line_end.unsqueeze(2).unsqueeze(3)  # (batch_size, num_lines, 1, 1, 2)
        
        # Vector from line start to end
        line_vec = line_end - line_start  # (batch_size, num_lines, 1, 1, 2)
        
        # Vector from line start to point
        point_vec = points - line_start  # (batch_size, num_lines, H, W, 2)
        
        # Project point onto line: t = (point_vec · line_vec) / ||line_vec||²
        line_length_sq = torch.sum(line_vec ** 2, dim=-1, keepdim=True)  # (batch_size, num_lines, 1, 1, 1)
        
        # Handle zero-length lines by returning large distance
        is_zero_length = line_length_sq < 1e-6
        line_length_sq = torch.clamp(line_length_sq, min=1e-6)  # Avoid division by zero
        
        # Dot product: point_vec · line_vec
        dot_product = torch.sum(point_vec * line_vec, dim=-1, keepdim=True)  # (batch_size, num_lines, H, W, 1)
        
        # Parameter t for projection (clamped to [0, 1] for line segment)
        t = torch.clamp(dot_product / line_length_sq, 0.0, 1.0)  # (batch_size, num_lines, H, W, 1)
        
        # Closest point on line segment
        closest_point = line_start + t * line_vec  # (batch_size, num_lines, H, W, 2)
        
        # Distance from point to closest point on line
        distance = torch.norm(points - closest_point, dim=-1)  # (batch_size, num_lines, H, W)
        
        # For zero-length lines, return large distance
        distance = torch.where(is_zero_length.squeeze(-1), 
                              torch.full_like(distance, 10.0), 
                              distance)
        
        return distance
    
    def render_lines(self, line_segments: torch.Tensor, line_widths: torch.Tensor = None) -> torch.Tensor:
        """
        Render line segments to image.
        
        Args:
            line_segments: Shape (batch_size, num_lines, 4) - [x1, y1, x2, y2] coordinates
            line_widths: Shape (batch_size, 1) - per-sample line widths or None for default
            
        Returns:
            rendered: Shape (batch_size, 1, H, W) - rendered image
        """
        batch_size, num_lines = line_segments.shape[:2]
        
        # Split into start and end points
        line_start = line_segments[..., :2]  # (batch_size, num_lines, 2)
        line_end = line_segments[..., 2:]    # (batch_size, num_lines, 2)
        
        # Create point grid
        points = torch.stack([self.x_coords, self.y_coords], dim=-1)  # (H, W, 2)
        
        # Calculate distances from each pixel to each line
        distances = self.point_to_line_distance(points, line_start, line_end)  # (batch_size, num_lines, H, W)
        
        # Use adaptive line widths if provided
        if line_widths is not None:
            # line_widths shape: (batch_size, 1) -> expand to (batch_size, num_lines, H, W)
            # Note: All lines in a sample use the same predicted line width
            effective_line_width = line_widths.view(batch_size, 1, 1, 1).expand(batch_size, num_lines, self.image_size, self.image_size)
        else:
            # Use default line width (scalar)
            effective_line_width = self.line_width
        
        # Convert distance to intensity (closer = brighter)
        # We want small distances to give high intensity, large distances to give low intensity
        if self.anti_alias:
            # Use exponential decay with steeper falloff for cleaner negative space
            sigma = effective_line_width / 6.0  # Tighter falloff (was /3.0)
            line_intensity = torch.exp(-distances**2 / (2 * sigma**2))
        else:
            # Hard threshold: intensity=1 if distance <= line_width/2, else 0
            line_intensity = (distances <= effective_line_width / 2.0).float()
        
        # Combine all lines (take maximum intensity)
        combined_intensity = torch.max(line_intensity, dim=1, keepdim=True)[0]  # (batch_size, 1, H, W)
        
        # Invert colors: we want black lines (low values) on white background (high values)
        # So where lines are present (high intensity), we want low output values
        inverted_intensity = 1.0 - combined_intensity
        
        return inverted_intensity
    
    def forward(self, line_segments: torch.Tensor, line_widths: torch.Tensor = None) -> torch.Tensor:
        """Forward pass - render line segments to images."""
        return self.render_lines(line_segments, line_widths)


class LineRenderingLoss(nn.Module):
    """Loss function that compares rendered line segments to target images."""
    
    def __init__(self, image_size: int = 48, line_width: float = 0.05, 
                 reconstruction_weight: float = 1.0, regularization_weight: float = 0.01,
                 fg_weight: float = 2.0, bg_weight: float = 1.0):
        super().__init__()
        self.renderer = DifferentiableLineRenderer(image_size, line_width)
        self.reconstruction_weight = reconstruction_weight
        self.regularization_weight = regularization_weight
        
        # Simple fixed weights - relative scaling handles character-specific adjustments
        self.fg_weight = fg_weight
        self.bg_weight = bg_weight
        
        # Loss functions
        self.mse_loss = nn.MSELoss()
        self.l1_loss = nn.L1Loss()
    
    def line_length_regularization(self, line_segments: torch.Tensor) -> torch.Tensor:
        """Smart sparsity regularization - only penalize unused lines."""
        # Calculate line lengths
        start_points = line_segments[..., :2]  # (batch_size, num_lines, 2)
        end_points = line_segments[..., 2:]    # (batch_size, num_lines, 2)
        
        lengths = torch.norm(end_points - start_points, dim=-1)  # (batch_size, num_lines)
        
        # Smart sparsity: only penalize lines that are too short to be useful
        # Relaxed threshold to allow longer lines for complex characters like '#'
        length_threshold = 0.03  # Minimum meaningful line length (reduced from 0.05)
        unused_lines = lengths < length_threshold
        
        # Encourage unused lines to have zero length
        unused_penalty = torch.mean(lengths[unused_lines] ** 2) if unused_lines.any() else torch.tensor(0.0, device=lengths.device)
        
        # Coordinate bounds: keep coordinates within [-0.5, 0.5]
        coord_penalty = torch.mean(torch.relu(torch.abs(line_segments) - 0.5) ** 2)
        
        return unused_penalty + coord_penalty
    
    def negative_space_regularization(self, rendered: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """
        Penalize artifacts in areas that should be pure background.
        
        For characters like '=' where there should be clean space between bars,
        this encourages the model to keep those areas completely white.
        """
        # Target areas that should be background (white = 1.0)
        target_bg = target > 0.8  # Pure white regions in target
        
        # Rendered areas that should also be background
        rendered_in_bg_areas = rendered[target_bg]
        
        # Penalize any non-white values in background areas
        # We want rendered values to be close to 1.0 (white) in these areas
        bg_penalty = torch.mean((1.0 - rendered_in_bg_areas) ** 2)
        
        return bg_penalty
    
    def curvature_loss(self, rendered: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """
        Penalize angular/sharp edges where curves should be smooth.
        
        Uses image gradients to encourage smooth transitions in curved characters.
        """
        # Calculate image gradients (edge detection)
        def get_gradients(img):
            # Sobel operators for edge detection
            sobel_x = torch.tensor([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=img.dtype, device=img.device).view(1, 1, 3, 3)
            sobel_y = torch.tensor([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=img.dtype, device=img.device).view(1, 1, 3, 3)
            
            # Apply padding for convolution
            img_padded = torch.nn.functional.pad(img, (1, 1, 1, 1), mode='reflect')
            
            grad_x = torch.nn.functional.conv2d(img_padded, sobel_x, padding=0)
            grad_y = torch.nn.functional.conv2d(img_padded, sobel_y, padding=0)
            
            return torch.sqrt(grad_x**2 + grad_y**2 + 1e-8)
        
        # Get edge maps
        target_edges = get_gradients(target)
        rendered_edges = get_gradients(rendered)
        
        # Penalize missing edges (target has edge, rendered doesn't)
        edge_mismatch = torch.mean((target_edges - rendered_edges) ** 2)
        
        return edge_mismatch
    
    def foreground_focused_loss(self, rendered: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """
        Loss function with relative background weighting.
        
        Key insight: Background loss must be relative to foreground content density,
        not absolute pixel counts. For sparse characters like "!" (5% FG, 95% BG),
        equal weighting would make background dominate. We normalize background weight
        by the foreground/background ratio to maintain consistent learning dynamics.
        """
        # Target and rendered are in [0, 1] range where 0=black, 1=white
        # Convert to foreground masks where 1=character, 0=background
        target_fg = 1.0 - target  # Invert: black pixels become 1
        rendered_fg = 1.0 - rendered
        
        # Calculate foreground/background ratios for relative weighting
        fg_mask = target_fg > 0.5
        
        # Calculate per-sample foreground ratios
        fg_ratios = torch.mean(fg_mask.float(), dim=[1, 2, 3], keepdim=True)  # (batch_size, 1, 1, 1)
        bg_ratios = 1.0 - fg_ratios
        
        # Relative background weighting - normalize by density ratio
        # For sparse chars: bg_weight gets reduced (bg_weight * 0.05/0.95 = bg_weight * 0.053)  
        # For dense chars: bg_weight stays higher (bg_weight * 0.4/0.6 = bg_weight * 0.67)
        relative_bg_weight = self.bg_weight * (fg_ratios / (bg_ratios + 1e-6))
        
        # Create weight mask with relative weighting
        weights = torch.where(fg_mask, self.fg_weight, relative_bg_weight)
        
        # Weighted MSE loss
        squared_diff = (rendered - target) ** 2
        weighted_loss = torch.mean(weights * squared_diff)
        
        # Add Dice coefficient for foreground overlap
        dice_loss = self.dice_loss(rendered_fg, target_fg)
        
        # Add negative space regularization for clean backgrounds
        negative_space_loss = self.negative_space_regularization(rendered, target)
        
        return weighted_loss + 0.5 * dice_loss + 0.1 * negative_space_loss
    
    def dice_loss(self, pred: torch.Tensor, target: torch.Tensor, smooth: float = 1e-6) -> torch.Tensor:
        """
        Dice coefficient loss for measuring foreground overlap.
        
        Dice = 2 * |intersection| / (|pred| + |target|)
        """
        # Flatten spatial dimensions
        pred_flat = pred.view(pred.shape[0], -1)
        target_flat = target.view(target.shape[0], -1)
        
        # Calculate intersection and union
        intersection = torch.sum(pred_flat * target_flat, dim=1)
        pred_sum = torch.sum(pred_flat, dim=1)
        target_sum = torch.sum(target_flat, dim=1)
        
        # Dice coefficient
        dice = (2.0 * intersection + smooth) / (pred_sum + target_sum + smooth)
        
        # Return as loss (1 - dice)
        return torch.mean(1.0 - dice)
    
    def line_diversity_regularization(self, line_segments: torch.Tensor) -> torch.Tensor:
        """Encourage diversity in line positions - prevent overlapping lines."""
        start_points = line_segments[..., :2]  # (batch_size, num_lines, 2)
        end_points = line_segments[..., 2:]    # (batch_size, num_lines, 2)
        lengths = torch.norm(end_points - start_points, dim=-1)  # (batch_size, num_lines)
        
        # Only consider lines that are long enough to be meaningful
        length_threshold = 0.03  # Relaxed for complex characters
        valid_lines = lengths > length_threshold
        
        diversity_loss = torch.tensor(0.0, device=line_segments.device)
        
        for batch_idx in range(line_segments.shape[0]):
            batch_valid = valid_lines[batch_idx]
            if batch_valid.sum() > 1:
                # Calculate midpoints of valid lines
                valid_starts = start_points[batch_idx][batch_valid]  # (num_valid, 2)
                valid_ends = end_points[batch_idx][batch_valid]      # (num_valid, 2)
                midpoints = (valid_starts + valid_ends) / 2         # (num_valid, 2)
                
                if len(midpoints) > 1:
                    # Calculate pairwise distances between midpoints
                    dist_matrix = torch.cdist(midpoints, midpoints)  # (num_valid, num_valid)
                    
                    # Remove diagonal and get upper triangle
                    mask = torch.triu(torch.ones_like(dist_matrix), diagonal=1).bool()
                    distances = dist_matrix[mask]
                    
                    # Penalize lines that are too close together
                    min_distance = 0.1  # Minimum distance between line midpoints
                    close_penalty = torch.relu(min_distance - distances)
                    diversity_loss += torch.mean(close_penalty ** 2)
        
        diversity_loss = diversity_loss / line_segments.shape[0]  # Average over batch
        
        # Add orientation diversity bonus to encourage horizontal/vertical/diagonal lines
        orientation_bonus = self.orientation_diversity_bonus(line_segments)
        
        # Add intersection bonus for complex characters like '#'
        intersection_reward = self.intersection_bonus(line_segments)
        
        return diversity_loss - 0.1 * orientation_bonus - 0.05 * intersection_reward  # Subtract bonuses (encourage diversity and intersections)
    
    def orientation_diversity_bonus(self, line_segments: torch.Tensor) -> torch.Tensor:
        """
        Encourage diversity in line orientations (horizontal, vertical, diagonal).
        
        Returns a bonus (positive value) when lines have diverse orientations.
        """
        start_points = line_segments[..., :2]  # (batch_size, num_lines, 2)
        end_points = line_segments[..., 2:]    # (batch_size, num_lines, 2)
        
        # Calculate line vectors
        line_vectors = end_points - start_points  # (batch_size, num_lines, 2)
        lengths = torch.norm(line_vectors, dim=-1)  # (batch_size, num_lines)
        
        # Only consider meaningful lines
        length_threshold = 0.03  # Relaxed for complex characters
        valid_lines = lengths > length_threshold
        
        orientation_bonus = torch.tensor(0.0, device=line_segments.device)
        
        for batch_idx in range(line_segments.shape[0]):
            batch_valid = valid_lines[batch_idx]
            if batch_valid.sum() > 1:
                valid_vectors = line_vectors[batch_idx][batch_valid]
                valid_lengths = lengths[batch_idx][batch_valid]
                
                # Normalize vectors to get unit directions
                unit_vectors = valid_vectors / (valid_lengths.unsqueeze(-1) + 1e-8)
                
                # Calculate angles (atan2 gives angle from -π to π)
                angles = torch.atan2(unit_vectors[:, 1], unit_vectors[:, 0])
                
                # Convert to [0, π] (since lines are bidirectional)
                angles = torch.abs(angles)
                angles = torch.where(angles > torch.pi/2, torch.pi - angles, angles)
                
                # Bonus for having lines in different orientation bins
                # Horizontal: [0, π/8], Diagonal1: [π/8, 3π/8], Vertical: [3π/8, π/2]
                horizontal_lines = (angles < torch.pi/8).float().sum()
                diagonal_lines = ((angles >= torch.pi/8) & (angles < 3*torch.pi/8)).float().sum()
                vertical_lines = (angles >= 3*torch.pi/8).float().sum()
                
                # Bonus for having lines in multiple orientation categories
                categories_used = (horizontal_lines > 0).float() + (diagonal_lines > 0).float() + (vertical_lines > 0).float()
                orientation_bonus += categories_used / 3.0  # Max bonus = 1.0 when all 3 categories used
        
        return orientation_bonus / line_segments.shape[0]  # Average across batch
    
    def intersection_bonus(self, line_segments: torch.Tensor) -> torch.Tensor:
        """
        Reward line segments that intersect with each other.
        
        For complex characters like '#', proper intersections are crucial.
        """
        start_points = line_segments[..., :2]  # (batch_size, num_lines, 2)
        end_points = line_segments[..., 2:]    # (batch_size, num_lines, 2)
        lengths = torch.norm(end_points - start_points, dim=-1)
        
        # Only consider meaningful lines
        length_threshold = 0.03  # Relaxed for complex characters
        valid_lines = lengths > length_threshold
        
        intersection_bonus = torch.tensor(0.0, device=line_segments.device)
        
        for batch_idx in range(line_segments.shape[0]):
            batch_valid = valid_lines[batch_idx]
            if batch_valid.sum() > 1:
                valid_starts = start_points[batch_idx][batch_valid]
                valid_ends = end_points[batch_idx][batch_valid]
                
                # Check all pairs of lines for intersections
                num_valid = valid_starts.shape[0]
                for i in range(num_valid):
                    for j in range(i + 1, num_valid):
                        # Line i: valid_starts[i] to valid_ends[i]
                        # Line j: valid_starts[j] to valid_ends[j]
                        
                        intersection_dist = self.line_intersection_distance(
                            valid_starts[i], valid_ends[i],
                            valid_starts[j], valid_ends[j]
                        )
                        
                        # Bonus for lines that intersect (small distance)
                        if intersection_dist < 0.05:  # Close intersection
                            intersection_bonus += 1.0
                        elif intersection_dist < 0.1:  # Nearby intersection
                            intersection_bonus += 0.5
        
        return intersection_bonus / line_segments.shape[0]
    
    def line_intersection_distance(self, start1, end1, start2, end2):
        """Calculate the minimum distance between two line segments."""
        # Parametric representation: P1(t) = start1 + t*(end1-start1), t in [0,1]
        # P2(s) = start2 + s*(end2-start2), s in [0,1]
        
        d1 = end1 - start1  # Direction vector 1
        d2 = end2 - start2  # Direction vector 2
        w = start1 - start2
        
        a = torch.dot(d1, d1)
        b = torch.dot(d1, d2)
        c = torch.dot(d2, d2)
        d = torch.dot(d1, w)
        e = torch.dot(d2, w)
        
        denom = a * c - b * b
        
        if denom.abs() < 1e-6:  # Lines are parallel
            # Distance from start2 to line1
            proj_length = torch.dot(w, d1) / (a + 1e-6)
            proj_length = torch.clamp(proj_length, 0, 1)
            closest_point1 = start1 + proj_length * d1
            return torch.norm(closest_point1 - start2)
        
        # Find closest points
        t = torch.clamp((b * e - c * d) / denom, 0, 1)
        s = torch.clamp((a * e - b * d) / denom, 0, 1)
        
        point1 = start1 + t * d1
        point2 = start2 + s * d2
        
        return torch.norm(point1 - point2)
    
    def forward(self, predicted_segments: torch.Tensor, target_images: torch.Tensor, predicted_line_widths: torch.Tensor = None) -> dict:
        """
        Calculate loss between predicted line segments and target images.
        
        Args:
            predicted_segments: Shape (batch_size, num_lines, 4) - predicted line segments
            target_images: Shape (batch_size, 1, H, W) - target images
            predicted_line_widths: Shape (batch_size, 1) - predicted line widths or None
            
        Returns:
            loss_dict: Dictionary containing individual loss components and total loss
        """
        # Render predicted line segments with adaptive line widths
        rendered_images = self.renderer(predicted_segments, predicted_line_widths)
        
        # Reconstruction loss - focus on foreground pixels
        reconstruction_loss = self.foreground_focused_loss(rendered_images, target_images)
        
        # Regularization losses
        length_reg = self.line_length_regularization(predicted_segments)
        diversity_reg = self.line_diversity_regularization(predicted_segments)
        
        # Total loss
        total_loss = (self.reconstruction_weight * reconstruction_loss + 
                     self.regularization_weight * (length_reg + diversity_reg))
        
        return {
            'total_loss': total_loss,
            'reconstruction_loss': reconstruction_loss,
            'length_regularization': length_reg,
            'diversity_regularization': diversity_reg
        }


def visualize_rendering(line_segments: torch.Tensor, target_image: Optional[torch.Tensor] = None,
                       save_path: Optional[str] = None, line_width: Optional[torch.Tensor] = None):
    """Visualize rendered line segments and optionally compare with target."""
    # Always use default renderer - pass adaptive line width to forward call only
    renderer = DifferentiableLineRenderer()
    
    with torch.no_grad():
        if line_segments.dim() == 2:  # Single sample
            line_segments = line_segments.unsqueeze(0)
        
        # Handle line width for rendering
        if line_width is not None:
            if line_width.dim() == 0:  # Scalar
                line_width = line_width.unsqueeze(0).unsqueeze(0)
            elif line_width.dim() == 1:  # 1D tensor
                line_width = line_width.unsqueeze(0)
            rendered = renderer(line_segments, line_width)
        else:
            rendered = renderer(line_segments)
        rendered_img = rendered[0, 0].cpu().numpy()
    
    if target_image is not None:
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Target image
        if target_image.dim() == 3:
            target_img = target_image[0].cpu().numpy()
        else:
            target_img = target_image.cpu().numpy()
        axes[0].imshow(target_img, cmap='gray')
        axes[0].set_title('Target')
        axes[0].axis('off')
        
        # Rendered image
        axes[1].imshow(rendered_img, cmap='gray')
        axes[1].set_title('Rendered')
        axes[1].axis('off')
        
        # Difference
        diff = np.abs(target_img - rendered_img)
        axes[2].imshow(diff, cmap='hot')
        axes[2].set_title('Difference')
        axes[2].axis('off')
    else:
        fig, ax = plt.subplots(1, 1, figsize=(6, 6))
        ax.imshow(rendered_img, cmap='gray')
        ax.set_title('Rendered Lines')
        ax.axis('off')
    
    # Always save, don't show interactive window
    if save_path is None:
        save_path = "rendered_lines.png"
    
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close()  # Close figure to free memory
    print(f"Visualization saved to {save_path}")


def test_renderer():
    """Test the differentiable renderer."""
    # Create some test line segments
    line_segments = torch.tensor([
        [[-0.3, -0.3, 0.3, 0.3],    # Diagonal line
         [-0.3, 0.3, 0.3, -0.3],    # Other diagonal
         [-0.4, 0.0, 0.4, 0.0],     # Horizontal line
         [0.0, -0.4, 0.0, 0.4]]     # Vertical line
    ]).float()
    
    # Test rendering
    renderer = DifferentiableLineRenderer()
    with torch.no_grad():
        rendered = renderer(line_segments)
    
    print(f"Line segments shape: {line_segments.shape}")
    print(f"Rendered image shape: {rendered.shape}")
    print(f"Rendered range: [{rendered.min():.3f}, {rendered.max():.3f}]")
    
    # Visualize (saves to file)
    visualize_rendering(line_segments[0], save_path="test_renderer_output.png")
    
    # Test loss function
    loss_fn = LineRenderingLoss()
    
    # Create dummy target (just random for testing)
    target = torch.rand(1, 1, 48, 48)
    
    # Calculate loss
    loss_dict = loss_fn(line_segments, target)
    
    print("\nLoss components:")
    for key, value in loss_dict.items():
        print(f"{key}: {value.item():.6f}")


if __name__ == '__main__':
    test_renderer()