const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt"); // Helps to hash and compare pw.

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/books/", async (request, response) => {
  const getBooksQuery = `
  SELECT
    *
  FROM
    book
  ORDER BY
    book_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

// User Register API
app.post("/users/", async (req, res) => {
  // Extract the user details from the req body.
  const userDetails = req.body;
  const { name, username, password, gender, location } = userDetails;

  // Encrypt the password using "bcrypt.hash(password, saltRounds)" method.
  const hashedPassword = await bcrypt.hash(password, 10);
  // Check if the user already exists with given the username.
  const getUserQuery = `SELECT * FROM user WHERE username = "${username}"`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    // If user doesn't exist>> Add user details into the db.
    const createUserQuery = `
			INSERT INTO
				user (name, username, password, gender, location)
			VALUES
				("${name}", "${username}", "${hashedPassword}", "${gender}", "${location}");`;

    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    res.send(`Created New User with userId: ${newUserId}`);
  } else {
    // If user already in the db>>
    res.status(400); // Bad request
    res.send("User already exists");
  }
});

// User Login API
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  // Check if the user exists in teh db.
  const getUserQuery = `SELECT * FROM user WHERE username="${username}";`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    // If doesn't exist >>
    res.status(400);
    res.send("Invalid User");
  } else {
    // If exists >> Validate pw using "bcrypt.compare(request.body_pw, dbUser_password)"
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      // Matched >>
      res.send("Login Success");
    } else {
      // Not matched >>
      res.status(400);
      res.send("Invalid Password");
    }
  }
});
