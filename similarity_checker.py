# similarity_checker.py
import sys
import json
from sentence_transformers import SentenceTransformer, util
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from Levenshtein import distance as levenshtein_distance

def levenshtein_similarity(text1, text2):
    max_len = max(len(text1), len(text2))
    if max_len == 0:
        return 1.0
    return 1 - (levenshtein_distance(text1, text2) / max_len)

def calculate_similarity(text1, text2):
    try:
        # TF-IDF Similarity
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform([text1, text2])
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        
        # Levenshtein Similarity
        lev_sim = levenshtein_similarity(text1, text2)
        
        # Semantic Similarity
        model = SentenceTransformer("all-MiniLM-L6-v2")
        embeddings = model.encode([text1, text2], convert_to_tensor=True)
        semantic_sim = util.pytorch_cos_sim(embeddings[0], embeddings[1]).item()
        
        # Calculate weighted similarity
        final_score = (0.2 * lev_sim) + (0.4 * cosine_sim) + (0.4 * semantic_sim)
        return round(final_score * 100, 2)
    except Exception as e:
        print(json.dumps({"error": f"Similarity calculation error: {str(e)}"}))
        return 0

def main():
    if len(sys.argv) != 3:  # Changed to expect 3 arguments
        print(json.dumps({"error": "Invalid arguments. Expected: script.py <query_file> <compare_text>"}))
        sys.exit(1)
        
    try:
        # Read the query file
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            query_text = f.read()
        
        # Get the comparison text from second argument
        compare_text = sys.argv[2]
            
        similarity = calculate_similarity(query_text, compare_text)
        print(json.dumps(similarity))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()