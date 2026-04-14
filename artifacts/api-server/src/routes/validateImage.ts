import express from "express";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import fs from "fs"; 
import { pool } from "../lib/db";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const description = req.body.description;
    const file = req.file;
    const assetType = req.body.assetType;

    if (!file || !description) {
      return res.status(400).json({ error: "Missing file or description" });
    }

    //api call1
    const api1Res = await axios.post(
      "https://asset-validation.onrender.com/parse-requirements",
      {
        project_description: description,
      }
    );

    const api1Data = api1Res.data;

    //api call2
    const formData = new FormData();
    formData.append("file", fs.createReadStream(file.path));
    formData.append("project_description", JSON.stringify(api1Data));

    const endpointMap: Record<string, string> = {
      image: "image-check",
      audio: "audio-check",
      text: "text-check",
      video: "video-check",
    };

    const apiPath = endpointMap[assetType];

    if (!apiPath) {
      return res.status(400).json({ error: "Invalid assetType" });
    }
    // const api2Res = await axios.post(
    //   "https://asset-validation.onrender.com/image-check",
    //   formData,
    //   {
    //     headers: formData.getHeaders(),
    //   }
    // );
    const api2Res = await axios.post(
      `https://asset-validation.onrender.com/${apiPath}`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    const api2Data = api2Res.data;
    await pool.query(
      `INSERT INTO validation_logs (file_name, description, api1_response, api2_response) 
      VALUES ($1, $2, $3, $4)`,
      [
        file.originalname,
        description,
        api1Data,
        api2Data,
     ]
   );
    res.json({
      api1: api1Data,
      api2: api2Data,
    });
    

  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Something went wrong",
    });
  }
});

export default router;