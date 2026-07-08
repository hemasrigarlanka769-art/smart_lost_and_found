import os
import numpy as np
import logging
from rapidfuzz import fuzz
from PIL import Image
import io
import requests

# Set up logging
logger = logging.getLogger(__name__)

# --- Try to load Sentence Transformers ---
SENTENCE_TRANSFORMERS_AVAILABLE = False
try:
    from sentence_transformers import SentenceTransformer, util
    # Load model lazily
    transformer_model = None
    SENTENCE_TRANSFORMERS_AVAILABLE = True
    logger.info("Sentence-Transformers is available for semantic descriptions.")
except ImportError:
    logger.warning("Sentence-Transformers not installed. Falling back to TF-IDF for text similarity.")
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

# --- Try to load PyTorch & Torchvision for Image Embeddings ---
TORCH_AVAILABLE = False
try:
    import torch
    import torchvision.transforms as transforms
    from torchvision.models import mobilenet_v3_large, MobileNet_V3_Large_Weights
    TORCH_AVAILABLE = True
    logger.info("PyTorch and Torchvision are available for image embeddings.")
    
    # Initialize MobileNet model and weights
    weights = MobileNet_V3_Large_Weights.DEFAULT
    image_model = mobilenet_v3_large(weights=weights)
    image_model.eval() # Set model to evaluation mode
    
    # Define image transform pipeline
    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
except ImportError:
    logger.warning("Torch/Torchvision not installed. Falling back to image color histograms.")
    image_model = None
    preprocess = None

def get_sentence_transformer():
    global transformer_model
    if not SENTENCE_TRANSFORMERS_AVAILABLE:
        return None
    if transformer_model is None:
        try:
            # Load the lightweight MiniLM model
            transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer: {e}")
            return None
    return transformer_model

# --- Text Similarity Fallback using TF-IDF ---
def calculate_tfidf_similarity(text1: str, text2: str) -> float:
    try:
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([text1, text2])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])
        return float(sim[0][0])
    except Exception as e:
        logger.error(f"TF-IDF failed: {e}")
        # Default string match if vectorizer fails (e.g. empty inputs)
        return fuzz.ratio(text1.lower(), text2.lower()) / 100.0

# --- Image Similarity Fallback using Histogram Corellation ---
def load_image_from_path_or_url(img_source) -> Image.Image:
    """Loads an image from file path, URL, or bytes."""
    if not img_source:
        return None
    try:
        if isinstance(img_source, bytes):
            return Image.open(io.BytesIO(img_source)).convert('RGB')
        elif img_source.startswith("http://") or img_source.startswith("https://"):
            response = requests.get(img_source, timeout=5)
            return Image.open(io.BytesIO(response.content)).convert('RGB')
        elif os.path.exists(img_source):
            return Image.open(img_source).convert('RGB')
    except Exception as e:
        logger.error(f"Failed to load image from {img_source}: {e}")
    return None

def calculate_histogram_similarity(img1: Image.Image, img2: Image.Image) -> float:
    """Fallback similarity using RGB color histogram correlation."""
    try:
        # Resize images to match dimensions
        img1 = img1.resize((100, 100))
        img2 = img2.resize((100, 100))
        
        h1 = np.array(img1.histogram(), dtype=np.float32)
        h2 = np.array(img2.histogram(), dtype=np.float32)
        
        # Normalize histograms
        h1 /= (h1.sum() + 1e-6)
        h2 /= (h2.sum() + 1e-6)
        
        # Calculate intersection
        intersection = np.minimum(h1, h2).sum()
        return float(intersection)
    except Exception as e:
        logger.error(f"Histogram comparison failed: {e}")
        return 0.5

# --- Main Feature Similarity Functions ---

def get_text_similarity(desc1: str, desc2: str) -> float:
    """Calculates semantic similarity between descriptions."""
    desc1 = desc1.strip().lower()
    desc2 = desc2.strip().lower()
    if not desc1 or not desc2:
        return 0.0

    model = get_sentence_transformer()
    if model:
        try:
            embeddings1 = model.encode(desc1, convert_to_tensor=True)
            embeddings2 = model.encode(desc2, convert_to_tensor=True)
            sim = util.cos_sim(embeddings1, embeddings2)
            return float(sim.item())
        except Exception as e:
            logger.error(f"SentenceTransformer encoding failed, using TF-IDF fallback: {e}")
    
    return calculate_tfidf_similarity(desc1, desc2)

def get_keyword_similarity(name1: str, name2: str, cat1: str, cat2: str) -> float:
    """Calculates keyword matching score using RapidFuzz."""
    # Compare names
    name_score = fuzz.token_set_ratio(name1.lower(), name2.lower()) / 100.0
    # Compare categories (must match or be similar)
    cat_score = 1.0 if cat1.lower() == cat2.lower() else fuzz.ratio(cat1.lower(), cat2.lower()) / 100.0
    
    # Combined score favoring name match
    return (name_score * 0.7) + (cat_score * 0.3)

def get_image_similarity(img_source1, img_source2) -> float:
    """Calculates image similarity score using MobileNet or Histogram fallback."""
    if not img_source1 or not img_source2:
        return 0.0

    im1 = load_image_from_path_or_url(img_source1)
    im2 = load_image_from_path_or_url(img_source2)

    if not im1 or not im2:
        return 0.0

    if TORCH_AVAILABLE and image_model:
        try:
            # Preprocess images
            tensor1 = preprocess(im1).unsqueeze(0)
            tensor2 = preprocess(im2).unsqueeze(0)

            # Extract features without computing gradients
            with torch.no_grad():
                feat1 = image_model(tensor1).flatten()
                feat2 = image_model(tensor2).flatten()

            # Cosine similarity
            cos_sim = torch.nn.functional.cosine_similarity(feat1, feat2, dim=0)
            # Map cosine range [-1, 1] to [0, 1]
            score = (cos_sim.item() + 1.0) / 2.0
            return float(score)
        except Exception as e:
            logger.error(f"PyTorch Image feature extraction failed, using histogram fallback: {e}")
    
    return calculate_histogram_similarity(im1, im2)

def calculate_match_score(lost_item, found_item) -> dict:
    """
    Computes overall match details and percentages.
    Weights:
      If both have images:
        - 30% Keyword (RapidFuzz)
        - 40% Description Semantic (SentenceTransformer / TF-IDF)
        - 30% Image (MobileNet / Histogram)
      If one or both lack images:
        - 40% Keyword (RapidFuzz)
        - 60% Description Semantic (SentenceTransformer / TF-IDF)
    """
    # 1. Keyword Score
    keyword_score = get_keyword_similarity(
        lost_item.name, found_item.name, 
        lost_item.category, found_item.category
    )

    # 2. Text / Semantic Score
    text_score = get_text_similarity(lost_item.description, found_item.description)

    # 3. Image Score
    has_images = bool(lost_item.image_url and found_item.image_url)
    image_score = 0.0
    if has_images:
        image_score = get_image_similarity(lost_item.image_url, found_item.image_url)

    # Calculate overall weighted score
    if has_images:
        overall_score = (0.30 * keyword_score) + (0.40 * text_score) + (0.30 * image_score)
    else:
        overall_score = (0.40 * keyword_score) + (0.60 * text_score)

    # Convert to 0-100 scale
    match_percentage = round(overall_score * 100, 2)
    keyword_pct = round(keyword_score * 100, 2)
    text_pct = round(text_score * 100, 2)
    image_pct = round(image_score * 100, 2) if has_images else 0.0

    return {
        "overall": match_percentage,
        "keyword": keyword_pct,
        "text": text_pct,
        "image": image_pct,
        "has_image": has_images
    }
