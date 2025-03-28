const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { validateUser, registerUser, verifyToken } = require("./CTL/UserCtl");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

app.post('/validate', validateUser);
app.post('/register', registerUser);
