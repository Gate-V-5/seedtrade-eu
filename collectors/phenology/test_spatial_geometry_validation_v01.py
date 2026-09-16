import unittest
from spatial_geometry_validation_v01 import geometry, overlap_area, same_grid


class GeometryTests(unittest.TestCase):
    def grid(self, bbox):
        return geometry({"crs": "EPSG:32634", "bbox": bbox,
                         "width_pixels": 2, "height_pixels": 2, "resolution_m": 10})

    def test_overlap_touch_and_disjoint(self):
        a = self.grid([0,0,20,20])
        self.assertEqual(overlap_area(a,self.grid([10,10,30,30])),100)
        self.assertEqual(overlap_area(a,self.grid([20,0,40,20])),0)
        self.assertEqual(overlap_area(a,self.grid([30,0,50,20])),0)

    def test_shifted_grid_is_different(self):
        a = self.grid([0,0,20,20])
        self.assertTrue(same_grid(a,a))
        self.assertFalse(same_grid(a,self.grid([1,0,21,20])))

    def test_reversed_bbox_fails(self):
        with self.assertRaisesRegex(ValueError,"Reversed"):
            self.grid([20,0,0,20])

    def test_resolution_mismatch_fails(self):
        with self.assertRaisesRegex(ValueError,"Resolution"):
            self.grid([0,0,21,20])


if __name__ == "__main__":
    unittest.main()
