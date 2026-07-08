import unittest
import os
import sys

# Add the parent directory to system path to import app modules correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import Base, engine, SessionLocal
from backend.app import models, ai_matcher

class TestSmartLostAndFound(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Generate clean tables on test start
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()
        
    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        # Drop testing tables
        Base.metadata.drop_all(bind=engine)

    def test_01_create_user(self):
        user = models.User(
            id="test-student-uid",
            email="test_student@college.edu",
            name="Test Student",
            role="student"
        )
        self.db.add(user)
        self.db.commit()
        
        db_user = self.db.query(models.User).filter(models.User.id == "test-student-uid").first()
        self.assertIsNotNone(db_user)
        self.assertEqual(db_user.name, "Test Student")
        self.assertEqual(db_user.role, "student")

    def test_02_ai_text_matching_success(self):
        # Similar descriptions
        desc_lost = "Black Lenovo ThinkPad laptop with a red sticker on the cover."
        desc_found = "Found Lenovo Laptop in library lobby. It has some red sticker stickers."
        
        similarity = ai_matcher.get_text_similarity(desc_lost, desc_found)
        self.assertGreater(similarity, 0.4, "Semantic match score should be high for similar terms")
        
        # Dissimilar descriptions
        desc_other = "Insulated silver metal Milton water bottle found near tables."
        dissimilarity = ai_matcher.get_text_similarity(desc_lost, desc_other)
        self.assertLess(dissimilarity, 0.25, "Semantic match score should be low for dissimilar items")

    def test_03_ai_keyword_matching(self):
        name_lost = "Lenovo ThinkPad Laptop"
        name_found = "Lenovo Laptop near library"
        cat_lost = "Electronics"
        cat_found = "Electronics"
        
        keyword_score = ai_matcher.get_keyword_similarity(name_lost, name_found, cat_lost, cat_found)
        self.assertGreater(keyword_score, 0.7, "Keyword matching should identify overlap and same category")
        
        # Different category
        cat_other = "Other"
        keyword_diff = ai_matcher.get_keyword_similarity(name_lost, "Milton silver bottle", cat_lost, cat_other)
        self.assertLess(keyword_diff, 0.3)

    def test_04_full_match_calculation(self):
        lost_item = models.LostItem(
            name="Lenovo ThinkPad Laptop",
            category="Electronics",
            description="Black Lenovo ThinkPad X1 Carbon laptop. Stickers on front lid.",
            location_lost="Library reading room",
            date_lost=models.datetime.datetime.utcnow(),
            contact_info="Ph: 999",
            status="lost",
            user_id="test-student-uid"
        )
        
        found_item = models.FoundItem(
            name="Lenovo Laptop near library",
            category="Electronics",
            description="Found Lenovo Laptop in library lobby lobby. It has some red stickers on top.",
            location_found="Library lobby",
            date_found=models.datetime.datetime.utcnow(),
            contact_info="Security Desk",
            status="found",
            user_id="test-student-uid"
        )
        
        scores = ai_matcher.calculate_match_score(lost_item, found_item)
        
        # Overall score should combine keyword (rapidfuzz) and text (TF-IDF/Transformers)
        self.assertIn("overall", scores)
        self.assertIn("text", scores)
        self.assertIn("keyword", scores)
        self.assertGreater(scores["overall"], 60.0, "Overall score should represent a high similarity match")

if __name__ == '__main__':
    unittest.main()
