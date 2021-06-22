const express = require("express");
const router = express.Router();

const db = require("../db/db.js");

//Returns the neighborhood of the given parameters
router.get("/getPhotos", function (req, res) {
  let dimension_name = req.query.dimension;
  let dimension_value = req.query.dimension_value;
  let dimension_id = req.query.dimension_id || 0; // no se si debería ser cero dado que el minimo es 69729241....
  console.log(
    "getPhotos " +
      " dimension_name:" +
      dimension_name +
      " dimension_value:" +
      dimension_value +
      " dimension_id:" +
      dimension_id
  );
  let photo_id;

  if (
    dimension_value !== undefined &&
    req.query.current_photo_id !== undefined
  ) {
    photo_id = req.query.current_photo_id;
    console.log("ENTRA IF 1 DE GET PHOTOS");
    db.returnPhotosFromDimensionNameValueAndPhotoID(
      res,
      photo_id,
      dimension_name,
      dimension_value
    );
  } else if (req.query.current_photo_id !== undefined) {
    photo_id = req.query.current_photo_id;
    console.log("ENTRA IF 2 DE GET PHOTOS");
    db.returnPhotosFromDimensionNameAndPhotoID(res, photo_id, dimension_name);
  } else if (
    req.query.dimension !== undefined &&
    req.query.dimension_value !== undefined
  ) {
    dimension_value = req.query.dimension_value;
    console.log("ENTRA IF 3 DE GET PHOTOS");
    db.returnPhotosFromDimensionValue(res, dimension_name, dimension_value);
  } else {
    console.log("ENTRA IF 4 DE GET PHOTOS");
    db.returnPhotosFromDimensionData(res, dimension_name, dimension_id);
  }
}); //getNextPhotos

//Get the photos before the given dimension_id
router.get("/getPreviousPhotos", function (req, res) {
  let dimension_id = req.query.dimension_id || 0;
  console.log("getPreviousPhotos " + " dimension_id:" + dimension_id);
  let photo_id;
  db.returnPreviousPhotosFromDimensionID(res, dimension_id);
}); //getNextPhotos

//Get the photos after the given dimension_id
router.get("/getNextPhotos", function (req, res) {
  let dimension_id = req.query.dimension_id || 0;
  console.log("getNextPhotos " + " dimension_id:" + dimension_id);
  let photo_id;
  db.returnNextPhotosFromDimensionID(res, dimension_id);
}); //getNextPhotos

router.get("/getRandomPhotos", function (req, res) {
  db.getRandomPhotos(res);
}); //getRandomPhotos

module.exports = router;
