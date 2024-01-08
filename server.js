
import express from "express";
import * as path from "path";
import { fileURLToPath } from 'url';

// create app and server
const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.listen(port, () => {
     console.log(`Server is up on port ${port}`);
});

app.use(express.static("public/dist"));
// app.use(express.static("textures"));
// app.use("/textures", express.static("textures"));

app.get('/', (req, res) => {
     res.send('Welcome to my server!');
});
