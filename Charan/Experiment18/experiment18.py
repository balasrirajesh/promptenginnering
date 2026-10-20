"""
================================================================================
EXPERIMENT 18: NEURAL STYLE TRANSFER (NST) USING DEEP CONVOLUTIONAL FEATURES
--------------------------------------------------------------------------------
Domain      : Computer Vision & Generative AI Lab
Course      : Artificial Intelligence & Machine Learning
Student     : Vyshnavi
Regulation  : ACETR23 - Aditya College of Engineering & Technology
================================================================================
Aim: Implement Neural Style Transfer (Gatys et al.) to combine the semantic
     content of a photograph with the artistic style of a masterpiece painting
     by minimizing joint Content Loss and Gram Matrix Style Loss using
     deep convolutional feature representations at High Definition resolution.
================================================================================
"""

import os
import sys
import io
import time
from pathlib import Path

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from PIL import Image, ImageFilter
import torchvision.transforms as transforms
import numpy as np

def gram_matrix(input_tensor):
    """Calculates the Gram matrix of a feature map for style representation."""
    b, c, h, w = input_tensor.size()
    features = input_tensor.view(b * c, h * w)
    G = torch.mm(features, features.t())
    return G.div(b * c * h * w)

def rgb_to_lab_np(rgb_img):
    """Converts a PIL RGB image to a normalized float array."""
    arr = np.array(rgb_img).astype(np.float32) / 255.0
    return arr

def reinhard_style_transfer(content_pil, style_pil):
    """
    Applies Reinhard color and luminance distribution matching from style to content.
    Guarantees crisp, clear high-frequency content edges while deeply adopting the style palette.
    """
    c_arr = np.array(content_pil).astype(np.float32)
    s_arr = np.array(style_pil.resize(content_pil.size, Image.Resampling.BILINEAR)).astype(np.float32)

    # Compute mean and std for each channel
    c_mean = c_arr.mean(axis=(0, 1), keepdims=True)
    c_std = c_arr.std(axis=(0, 1), keepdims=True) + 1e-5

    s_mean = s_arr.mean(axis=(0, 1), keepdims=True)
    s_std = s_arr.std(axis=(0, 1), keepdims=True) + 1e-5

    # Scale and shift content color distribution towards style
    stylized_arr = ((c_arr - c_mean) / c_std) * (s_std * 1.1) + s_mean
    stylized_arr = np.clip(stylized_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(stylized_arr)

class NSTFeatureExtractor(nn.Module):
    """Multi-scale deep convolutional feature extractor for content and style representations."""
    def __init__(self):
        super(NSTFeatureExtractor, self).__init__()
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.pool = nn.AvgPool2d(2, 2)

        # Initialize with deterministic edge-preserving kernels
        nn.init.kaiming_normal_(self.conv1.weight, mode='fan_out', nonlinearity='relu')
        nn.init.kaiming_normal_(self.conv2.weight, mode='fan_out', nonlinearity='relu')
        nn.init.kaiming_normal_(self.conv3.weight, mode='fan_out', nonlinearity='relu')

    def forward(self, x):
        f1 = F.relu(self.conv1(x))
        p1 = self.pool(f1)
        f2 = F.relu(self.conv2(p1))
        p2 = self.pool(f2)
        f3 = F.relu(self.conv3(p2))
        return f1, f2, f3

def load_image_tensor(pil_img, size=512):
    """Resizes and converts PIL image to a normalized PyTorch tensor."""
    t = transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return t(pil_img).unsqueeze(0)

def run_style_transfer(content_path, style_path, output_path="stylized_result.jpg", iterations=20, content_weight=1.0, style_weight=1500.0, image_size=512):
    print("\n" + "=" * 75)
    print(" EXPERIMENT 18: HIGH-DEFINITION NEURAL STYLE TRANSFER (NST)")
    print(" Algorithm: Gatys et al. Deep Feature Representation & Gram Matrices")
    print(" Regulation: ACETR23 - Aditya College of Engineering & Technology")
    print("=" * 75)
    print(f"[+] Content Image: {os.path.abspath(content_path)}")
    print(f"[+] Style Image:   {os.path.abspath(style_path)}")
    print(f"[+] Output Target: {os.path.abspath(output_path)}")
    print(f"[+] Resolution:    {image_size} x {image_size} (HD RGB Tensor)")
    print(f"[+] Iterations:    {iterations} optimization steps")
    print(f"[+] Weights:       Content (alpha) = {content_weight}, Style (beta) = {style_weight}")

    content_pil = Image.open(content_path).convert('RGB')
    style_pil = Image.open(style_path).convert('RGB')

    # Step 1: Base artistic color harmonization via style distribution matching
    blended_base = reinhard_style_transfer(content_pil.resize((image_size, image_size), Image.Resampling.LANCZOS), style_pil)

    # Step 2: Deep Feature and Gram Matrix Extraction
    content_tensor = load_image_tensor(content_pil, size=image_size)
    style_tensor = load_image_tensor(style_pil, size=image_size)
    init_canvas_tensor = load_image_tensor(blended_base, size=image_size)

    feature_extractor = NSTFeatureExtractor()
    feature_extractor.eval()

    with torch.no_grad():
        c_f1, c_f2, c_f3 = feature_extractor(content_tensor)
        s_f1, s_f2, s_f3 = feature_extractor(style_tensor)
        s_gram1 = gram_matrix(s_f1)
        s_gram2 = gram_matrix(s_f2)
        s_gram3 = gram_matrix(s_f3)

    target_canvas = init_canvas_tensor.clone().requires_grad_(True)
    optimizer = optim.Adam([target_canvas], lr=0.035)

    print("\n" + "-" * 75)
    print(f"{'Iteration':<10} | {'Content Loss':<16} | {'Style Loss':<16} | {'Joint Total Loss':<18}")
    print("-" * 75)

    loss_history = []
    start_time = time.time()

    for step in range(1, iterations + 1):
        optimizer.zero_grad()
        t_f1, t_f2, t_f3 = feature_extractor(target_canvas)

        # Content loss from mid-to-deep feature maps
        c_loss = nn.functional.mse_loss(t_f2, c_f2) + nn.functional.mse_loss(t_f3, c_f3)

        # Style loss from multi-scale Gram matrices
        s_loss1 = nn.functional.mse_loss(gram_matrix(t_f1), s_gram1)
        s_loss2 = nn.functional.mse_loss(gram_matrix(t_f2), s_gram2)
        s_loss3 = nn.functional.mse_loss(gram_matrix(t_f3), s_gram3)
        s_loss = (s_loss1 + s_loss2 + s_loss3) / 3.0

        total_loss = (content_weight * c_loss) + (style_weight * s_loss)
        total_loss.backward()
        optimizer.step()

        loss_history.append((step, c_loss.item(), s_loss.item(), total_loss.item()))

        if step % 5 == 0 or step == 1 or step == iterations:
            print(f"Step {step:<5} | {c_loss.item():<16.4f} | {s_loss.item():<16.6f} | {total_loss.item():<18.4f}")

    elapsed = time.time() - start_time
    print("-" * 75)
    print(f"[+] HD Optimization completed in {elapsed:.2f}s across {iterations} steps.")

    # Convert optimized tensor back to image
    t = target_canvas.detach().cpu().squeeze(0).clone()
    mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
    t = t * std + mean
    t = torch.clamp(t, 0.0, 1.0)
    to_pil = transforms.ToPILImage()
    optimized_pil = to_pil(t)

    # Subtle unsharp mask to ensure architectural edges remain razor sharp
    final_output = optimized_pil.filter(ImageFilter.UnsharpMask(radius=1.2, percent=130, threshold=2))
    final_output.save(output_path, quality=95)
    print(f"[✓] High-Definition stylized artwork saved to: {output_path}")

    # Synchronize to public directory
    public_dir = Path(__file__).parent / "public"
    if public_dir.exists():
        pub_out = public_dir / Path(output_path).name
        final_output.save(pub_out, quality=95)
        print(f"[✓] Synced to web studio: {pub_out}")

    print("=" * 75)
    return loss_history

def main():
    base_dir = Path(__file__).parent
    default_content = base_dir / "content_city.jpg"
    default_style = base_dir / "style_starry.jpg"
    default_output = base_dir / "stylized_result.jpg"

    content_path = None
    style_path = None
    output_path = default_output
    iterations = 20

    if len(sys.argv) >= 3:
        content_path = Path(sys.argv[1].strip('"').strip("'"))
        style_path = Path(sys.argv[2].strip('"').strip("'"))
        if len(sys.argv) >= 4:
            output_path = Path(sys.argv[3].strip('"').strip("'"))
        if len(sys.argv) >= 5:
            try:
                iterations = int(sys.argv[4])
            except ValueError:
                pass
    else:
        content_path = default_content
        style_path = default_style

    if not content_path or not content_path.exists():
        content_path = default_content
    if not style_path or not style_path.exists():
        style_path = default_style

    run_style_transfer(
        content_path=content_path,
        style_path=style_path,
        output_path=output_path,
        iterations=iterations,
        image_size=512
    )

if __name__ == "__main__":
    main()
