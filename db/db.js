var sqlite3 = require("sqlite3").verbose();
var connection = new sqlite3.Database("./db/photoring.db");

const LIMIT = 500;

/* Given a batch of rows, it finds the relative Index position of the dimension_id in that set of rows*/
/* It usually returns 250, unless we are at the border of the photoDimension Table, in which case */
/* it might just return a bigger or an smaller value*/
module.exports.getIndexOfDimensionID = function (rows, dimension_id) {
  dimension_id = +dimension_id;
  let foundit = false;
  let curr;
  let w = rows.length;
  let i = Math.floor(w / 2),
    pi;
  while (!foundit) {
    pi = i;
    curr = rows[i];
    w = w / 2;
    if (w < 0.5) {
      console.log("Couldn't find it " + i);
      return i;
    }
    if (curr.dimension_id === dimension_id) {
      foundit = true;
      console.log("Found it " + i);
      return i;
    } else if (curr.dimension_id > dimension_id) {
      //search left
      i = Math.round(i - w / 2);
      if (pi === i && i > 0) {
        i -= 1;
      }
    } else {
      i = Math.round(i + w / 2);
      if (pi === i && i < rows.length - 1) {
        i += 1;
      }
    }
    console.log(pi + " " + curr.dimension_id + " " + dimension_id);
  }
  return -1;
};

/*For a valid dimension_name, returns the start postions and the length of each section in that dimension.*/
/*It also returns the results ordered by dimension value*/
module.exports.getDimensionCounts = function (dimension_name, callback) {
  console.log("getDimensionCounts " + dimension_name);
  connection.all(
    "SELECT dimension_name, dimension_value, count, min_dimension_id from dimensionValueCounts \
      where dimension_name = ? order by dimension_value",
    [dimension_name],
    function (err, rows) {
      let result = [];

      if (err) {
        console.log(
          "ERROR: getDimensions Error querying dimension_name +  " +
            dimension_name
        );
        console.error(err);
        result = { error: "DB_ERROR", exception: err };
        return;
      } else if (rows.length < 1) {
        console.log(
          "ERROR: getDimensions Couldn't find dimension_name +  " +
            dimension_name
        );
        console.log(err);
        result = { error: "NO_DIMENSION" };
        return;
      } else {
        result = rows;
        let numberOfRows = rows.length;
        console.log("obtained dimension counts from DB. Size: " + numberOfRows);
      }

      callback(result);
    }
  );
  return;
};

module.exports.returnNextPhotosFromDimensionID = function (res, dimension_id) {
  // console.log(dimension_id);
  console.log(
    "returnPhotosFromDimensionID  " + " dimension_id=" + dimension_id
  );
  connection.all(
    "SELECT * from photoDimensionAllTags \
            where dimension_id > ? \
          order by dimension_id limit " +
      LIMIT,
    [dimension_id],
    function (err, rows) {
      let result = {},
        dimension_name;
      // let rowI;
      if (err) {
        result.exception = err;
        result.error = "DB_ERROR";
        console.error("Failed");
        console.error(err);
        res.end(JSON.stringify(result));
        return;
      }
      result.photos = rows;
      dimension_name = rows[0].dimension_name; // rows[0] is undefined sometimes? YES border conditions
      module.exports.getDimensionCounts(
        dimension_name,
        function (dimension_values) {
          result.dimension_values = dimension_values;
          res.end(JSON.stringify(result));
        }
      );
    }
  );
};

module.exports.returnPreviousPhotosFromDimensionID = function (
  res,
  dimension_id
) {
  // console.log(dimension_id);
  console.log(
    "returnPreviousPhotosFromDimensionID  " + " dimension_id=" + dimension_id
  );
  connection.all(
    "SELECT * FROM (SELECT * from photoDimensionAllTags \
            where dimension_id < ? \
          order by dimension_id DESC limit " +
      LIMIT +
      ") as t \
          ORDER BY dimension_id",
    [dimension_id],
    function (err, rows) {
      let result = {},
        dimension_name;
      // let rowI;
      if (err) {
        result.exception = err;
        result.error = "DB_ERROR";
        console.error("Failed");
        console.error(err);
        res.end(JSON.stringify(result));
        return;
      }
      result.photos = rows;
      dimension_name = rows[0].dimension_name;
      module.exports.getDimensionCounts(
        dimension_name,
        function (dimension_values) {
          result.dimension_values = dimension_values;
          res.end(JSON.stringify(result));
        }
      );
    }
  );
};

/*Return photos given a dimension_id from PhotoDimension*/
/* The result set has rows, the focus index and dimension_values for the dimension of the focus index image*/
module.exports.returnPhotosFromDimensionID = function (res, dimension_id) {
  // console.log(dimension_id);
  console.log(
    "returnPhotosFromDimensionID  " + " dimension_id=" + dimension_id
  );
  connection.all(
    `
    SELECT * FROM (
      SELECT * FROM photoDimensionAllTags
      WHERE dimension_id >= ?
      ORDER BY dimension_id ASC LIMIT ${LIMIT / 2}
    )
    UNION
    SELECT * FROM (
      SELECT * FROM photoDimensionAllTags
      WHERE dimension_id < ?
      ORDER BY dimension_id DESC LIMIT ${LIMIT / 2}
    )
    ORDER by dimension_id`,
    [dimension_id, dimension_id],
    function (err, rows) {
      let result = {},
        dimension_name;
      let rowI;
      if (err) {
        result.exception = err;
        result.error = "DB_ERROR";
        console.error("Failed");
        console.error(err);
        res.end(JSON.stringify(result));
        return;
      }
      result.photos = rows;
      rowI = module.exports.getIndexOfDimensionID(rows, dimension_id);
      console.log(
        "getIndexOfDimensionID dimension_id = " +
          dimension_id +
          " center =" +
          rowI
      );
      result.center = rowI;
      dimension_name = rows[rowI].dimension_name;
      module.exports.getDimensionCounts(
        dimension_name,
        function (dimension_values) {
          result.dimension_values = dimension_values;
          res.end(JSON.stringify(result));
        }
      );
    }
  );
};

module.exports.returnPhotosFromDimensionData = function (
  res,
  dimension_name,
  dimension_id
) {
  // console.log(dimension_id);
  console.log(
    "returnPhotosFromDimensionData  " +
      " dimension_name=" +
      dimension_name +
      " dimension_id=" +
      dimension_id
  );
  connection.all(
    `
    SELECT * FROM (
      SELECT * FROM photoDimensionAllTags
      WHERE dimension_name = ? and dimension_id >= ?
      ORDER BY dimension_id ASC LIMIT ${LIMIT / 2}
    )
    UNION
    SELECT * FROM (
      SELECT * FROM photoDimensionAllTags
      WHERE dimension_name = ? and dimension_id < ?
      ORDER BY dimension_id DESC LIMIT ${LIMIT / 2}
    )
    ORDER by dimension_id`,
    [dimension_name, dimension_id, dimension_name, dimension_id],
    function (err, rows) {
      let result = {};
      if (err) {
        result.exception = err;
        result.error = "DB_ERROR";
        console.error("Failed");
        console.error(err);
        res.end(JSON.stringify(result));
        return;
      }
      result.photos = rows;
      let rowI = module.exports.getIndexOfDimensionID(rows, dimension_id);
      console.log(
        "getIndexOfDimensionID dimension_id = " +
          dimension_id +
          " center =" +
          rowI
      );
      result.center = rowI;
      module.exports.getDimensionCounts(
        dimension_name,
        function (dimension_values) {
          result.dimension_values = dimension_values;
          res.end(JSON.stringify(result));
        }
      );
    }
  );
};

module.exports.returnPhotosFromDimensionValue = function (
  res,
  dimension_name,
  dimension_value
) {
  // console.log(dimension_id);
  console.log(
    "returnPhotosFromDimensionValue  " +
      " dimension_name=" +
      dimension_name +
      " dimension_value=" +
      dimension_value
  );
  connection.all(
    "SELECT * from photoDimensionAllTags\
      where dimension_name = ? and dimension_value like ? \
    order by dimension_id \
    limit " +
      LIMIT,
    [dimension_name, dimension_value],
    function (err, rows) {
      let result = {};
      if (err) {
        result.exception = err;
        result.error = "DB_ERROR";
        console.error("Failed");
        console.error(err);
        res.end(JSON.stringify(result));
        return;
      }
      result.photos = rows;

      let rowI = module.exports.getIndexOfDimensionID(rows, dimension_id);
      console.log(
        "getIndexOfDimensionID dimension_id = " +
          dimension_id +
          " center =" +
          rowI
      );
      result.center = rowI;
      module.exports.getDimensionCounts(
        dimension_name,
        function (dimension_values) {
          result.dimension_values = dimension_values;
          res.end(JSON.stringify(result));
        }
      );
    }
  );
};

module.exports.returnPhotosFromDimensionNameAndPhotoID = function (
  res,
  photo_id,
  dimension_name
) {
  // photo_id es unico, entonces no veo porque...
  console.log(
    "returnPhotosFromDimensionNameAndPhotoID  " +
      " dimension_name=" +
      dimension_name +
      " photo_id=" +
      photo_id
  );
  connection.all(
    "SELECT dimension_id from photoDimension \
  where photo_id = ? and dimension_name = ?",
    [photo_id, dimension_name],
    function (err, rows) {
      let dimension_id = null;
      if (err) {
        console.log(
          "ERROR: returnPhotosFromDimensionNameAndPhotoID Error querying photo_id +  " +
            photo_id
        );
        console.error(err);
        res.end(JSON.stringify({ error: "DB_ERROR", exception: err }));
        return;
      } else if (rows.length < 1) {
        console.log(
          "ERROR: returnPhotosFromDimensionNameAndPhotoID Couldn't find photo with photo_id +  " +
            photo_id
        );
        console.log(err);
        res.end(JSON.stringify({ error: "NO_PHOTO" }));
        return;
      } else {
        dimension_id = rows[0].dimension_id;
      }
      module.exports.returnPhotosFromDimensionData(
        res,
        dimension_name,
        dimension_id
      );
    }
  );
};

module.exports.returnPhotosFromDimensionNameValueAndPhotoID = function (
  res,
  photo_id,
  dimension_name,
  dimension_value
) {
  // photo_id es unico, entonces no veo porque...
  console.log(
    "returnPhotosFromDimensionNameValueAndPhotoID  " +
      " dimension_name=" +
      dimension_name +
      " photo_id=" +
      photo_id +
      " dimension_value=" +
      dimension_value
  );
  connection.all(
    "SELECT dimension_id from photoDimension \
  where photo_id = ? and dimension_name = ? and dimension_value = ?",
    [photo_id, dimension_name, dimension_value],
    function (err, rows) {
      let dimension_id = null;
      if (err) {
        console.log(
          "ERROR: returnPhotosFromDimensionNameValueAndPhotoID Error querying photo_id +  " +
            photo_id
        );
        console.error(err);
        res.end(JSON.stringify({ error: "DB_ERROR", exception: err }));
        return;
      } else if (rows.length < 1) {
        console.log(
          "ERROR: returnPhotosFromDimensionNameValueAndPhotoID Couldn't find photo with photo_id +  " +
            photo_id
        );
        console.log(err);
        res.end(JSON.stringify({ error: "NO_PHOTO" }));
        return;
      } else {
        dimension_id = rows[0].dimension_id;
      }
      module.exports.returnPhotosFromDimensionData(
        res,
        dimension_name,
        dimension_id
      );
    }
  );
};

module.exports.getRandomPhotos = function (res) {
  connection.all(
    "SELECT min(dimension_id) as min, max(dimension_id) as max FROM photoDimensionAllTags",
    function (err, rows) {
      let min_dimension_id, max_dimension_id, dimension_id;
      if (err) {
        console.log("ERROR: getting min and max dimension_id ");
        console.error(err);
        res.end(
          JSON.stringify({
            error: "DB_ERROR",
            msg: "getting min and max dimension_id",
            exception: err,
          })
        );
        return;
      }
      min_dimension_id = +rows[0].min;
      max_dimension_id = +rows[0].max;
      dimension_id = Math.floor(
        Math.random() * (max_dimension_id - min_dimension_id) + min_dimension_id
      );
      console.log(
        "getRandomPhotos dimension id min=" +
          min_dimension_id +
          " max " +
          max_dimension_id +
          " returning photos for id = " +
          dimension_id
      );
      module.exports.returnPhotosFromDimensionID(res, dimension_id);
    }
  ); //callback
};
