import { db } from "@workspace/db";
import {
  usersTable,
  projectsTable,
  projectConfigsTable,
  assetValidationsTable,
  systemPromptsTable,
} from "@workspace/db/schema";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function seedAdminUser() {
  try {
    const [{ value }] = await db.select({ value: count() }).from(usersTable);
    if (Number(value) > 0) return;

    const adminHash = await bcrypt.hash("admin123", 10);
    const userHash = await bcrypt.hash("user123", 10);

    const [admin] = await db
      .insert(usersTable)
      .values({
        fullName: "Admin",
        email: "admin@example.com",
        passwordHash: adminHash,
        role: "admin",
      })
      .returning();

    const [user1] = await db
      .insert(usersTable)
      .values({
        fullName: "Sarah Mitchell",
        email: "sarah@example.com",
        passwordHash: userHash,
        role: "user",
        createdBy: admin.id,
      })
      .returning();

    const [user2] = await db
      .insert(usersTable)
      .values({
        fullName: "James Carter",
        email: "james@example.com",
        passwordHash: userHash,
        role: "user",
        createdBy: admin.id,
      })
      .returning();

    logger.info("Seeded users");

    // System prompts
    await db.insert(systemPromptsTable).values([
      {
        modality: "image",
        version: "v1.0",
        prompt:
          "You are an image content validator. Analyze the provided image against the given rules. Check for quality, appropriateness, branding compliance, and any violations. Return a JSON object with: status ('PASS' or 'FAIL'), reasons (array of strings explaining your decision), confidence (float 0-1).",
        isActive: true,
      },
      {
        modality: "text",
        version: "v1.0",
        prompt:
          "You are a text content validator. Analyze the provided text against the given rules. Check for tone, accuracy, compliance, and policy violations. Return a JSON object with: status ('PASS' or 'FAIL'), reasons (array of strings explaining your decision), confidence (float 0-1).",
        isActive: true,
      },
      {
        modality: "audio",
        version: "v1.0",
        prompt:
          "You are an audio content validator. Analyze the provided audio transcript or metadata against the given rules. Return a JSON object with: status ('PASS' or 'FAIL'), reasons (array of strings explaining your decision), confidence (float 0-1).",
        isActive: true,
      },
      {
        modality: "video",
        version: "v1.0",
        prompt:
          "You are a video content validator. Analyze the provided video metadata or frame description against the given rules. Return a JSON object with: status ('PASS' or 'FAIL'), reasons (array of strings explaining your decision), confidence (float 0-1).",
        isActive: true,
      },
    ]);

    logger.info("Seeded system prompts");

    // Projects
    const [imgProject] = await db
      .insert(projectsTable)
      .values({
        name: "Product Images",
        type: "image",
        storageFolderLink: "https://drive.google.com/drive/folders/product-images",
        userId: user1.id,
      })
      .returning();

    const [textProject] = await db
      .insert(projectsTable)
      .values({
        name: "Marketing Copy",
        type: "text",
        storageFolderLink: "https://drive.google.com/drive/folders/marketing-copy",
        userId: user1.id,
      })
      .returning();

    const [audioProject] = await db
      .insert(projectsTable)
      .values({
        name: "Podcast Episodes",
        type: "audio",
        storageFolderLink: "https://drive.google.com/drive/folders/podcasts",
        userId: user2.id,
      })
      .returning();

    const [videoProject] = await db
      .insert(projectsTable)
      .values({
        name: "Ad Creatives",
        type: "video",
        storageFolderLink: "https://drive.google.com/drive/folders/ad-creatives",
        userId: user2.id,
      })
      .returning();

    // Project configs
    await db.insert(projectConfigsTable).values([
      {
        projectId: imgProject.id,
        validationRules:
          "Image must have white background. No watermarks allowed. Minimum resolution 800x800px. Product must be centered. No blurry images.",
        enablePIIValidation: true,
        enableBlurCheck: true,
        enableDuplicationCheck: true,
      },
      {
        projectId: textProject.id,
        validationRules:
          "Text must be professional and free of grammatical errors. No offensive language. Must include a clear call-to-action. Max 300 words. No competitor brand mentions.",
        enablePIIValidation: true,
        enableBlurCheck: false,
        enableDuplicationCheck: true,
      },
      {
        projectId: audioProject.id,
        validationRules:
          "Audio must be clear with no background noise. Duration between 20-60 minutes. Must include proper intro and outro. No offensive content.",
        enablePIIValidation: false,
        enableBlurCheck: false,
        enableDuplicationCheck: true,
      },
      {
        projectId: videoProject.id,
        validationRules:
          "Video must be 16:9 aspect ratio. Duration 15-60 seconds. Must include brand logo. No competitor products visible. High quality audio required.",
        enablePIIValidation: false,
        enableBlurCheck: true,
        enableDuplicationCheck: true,
      },
    ]);

    logger.info("Seeded projects and configs");

    // Image validations
    await db.insert(assetValidationsTable).values([
      {
        projectId: imgProject.id,
        assetName: "sneaker-hero-shot.jpg",
        assetContent: "",
        assetType: "image",
        assetHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        validationResult: "PASS",
        reasons: [
          "White background confirmed",
          "Product is centered in frame",
          "No watermarks detected",
          "Resolution exceeds minimum requirement",
          "Image is sharp and well-lit",
        ],
        confidence: "0.96",
        tokensUsed: 1240,
        latency: 1820,
        cost: "0.009800",
        rawResponse: '{"status":"PASS","reasons":["White background confirmed","Product is centered in frame","No watermarks detected","Resolution exceeds minimum requirement","Image is sharp and well-lit"],"confidence":0.96}',
        preCheckResults: { blurScore: 94.2, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: imgProject.id,
        assetName: "handbag-lifestyle.jpg",
        assetContent: "",
        assetType: "image",
        assetHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
        validationResult: "FAIL",
        reasons: [
          "Background is not white — lifestyle setting detected",
          "Product is off-center",
          "Competing brand partially visible in background",
        ],
        confidence: "0.91",
        tokensUsed: 980,
        latency: 1540,
        cost: "0.007700",
        rawResponse: '{"status":"FAIL","reasons":["Background is not white — lifestyle setting detected","Product is off-center","Competing brand partially visible in background"],"confidence":0.91}',
        preCheckResults: { blurScore: 88.1, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: imgProject.id,
        assetName: "watch-packshot.jpg",
        assetContent: "",
        assetType: "image",
        assetHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        validationResult: "PASS",
        reasons: [
          "Clean white background",
          "Watch is centered and well-framed",
          "High resolution — 1200x1200px detected",
          "No watermarks or overlays",
        ],
        confidence: "0.98",
        tokensUsed: 1100,
        latency: 1650,
        cost: "0.008600",
        rawResponse: '{"status":"PASS","reasons":["Clean white background","Watch is centered and well-framed","High resolution — 1200x1200px detected","No watermarks or overlays"],"confidence":0.98}',
        preCheckResults: { blurScore: 97.5, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: imgProject.id,
        assetName: "sunglasses-blurry.jpg",
        assetContent: "",
        assetType: "image",
        assetHash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
        validationResult: "FAIL",
        reasons: [
          "Image is blurry — blur score below threshold",
          "Product edges are not clearly defined",
        ],
        confidence: "0.89",
        tokensUsed: 870,
        latency: 1310,
        cost: "0.006800",
        rawResponse: '{"status":"FAIL","reasons":["Image is blurry — blur score below threshold","Product edges are not clearly defined"],"confidence":0.89}',
        preCheckResults: { blurScore: 28.3, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: imgProject.id,
        assetName: "perfume-bottle.jpg",
        assetContent: "",
        assetType: "image",
        assetHash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
        validationResult: "PASS",
        reasons: [
          "White background confirmed",
          "Bottle perfectly centered",
          "Sharp and high-quality image",
          "No prohibited elements detected",
        ],
        confidence: "0.97",
        tokensUsed: 1050,
        latency: 1580,
        cost: "0.008200",
        rawResponse: '{"status":"PASS","reasons":["White background confirmed","Bottle perfectly centered","Sharp and high-quality image","No prohibited elements detected"],"confidence":0.97}',
        preCheckResults: { blurScore: 96.1, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
    ]);

    // Text validations
    await db.insert(assetValidationsTable).values([
      {
        projectId: textProject.id,
        assetName: "summer-sale-banner.txt",
        assetContent: "Discover our hottest summer deals — up to 50% off on selected items. Shop now and refresh your wardrobe before the season ends. Limited time offer.",
        assetType: "text",
        assetHash: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1",
        validationResult: "PASS",
        reasons: [
          "Professional and engaging tone",
          "Clear call-to-action: 'Shop now'",
          "No grammatical errors detected",
          "Word count within limit (28 words)",
          "No competitor mentions",
        ],
        confidence: "0.94",
        tokensUsed: 320,
        latency: 890,
        cost: "0.002100",
        rawResponse: '{"status":"PASS","reasons":["Professional and engaging tone","Clear call-to-action: \'Shop now\'","No grammatical errors detected","Word count within limit","No competitor mentions"],"confidence":0.94}',
        preCheckResults: { blurScore: null, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: textProject.id,
        assetName: "product-description-v2.txt",
        assetContent: "Buy our shoes theyre the best you can get. Nike and Adidas cant compare to us!! Contact john@company.com for bulk orders.",
        assetType: "text",
        assetHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b3",
        validationResult: "FAIL",
        reasons: [
          "Grammatical error: 'theyre' should be 'they're'",
          "Competitor brand names mentioned: Nike, Adidas",
          "Unprofessional use of excessive punctuation (!!)",
          "PII detected: email address in content",
        ],
        confidence: "0.97",
        tokensUsed: 410,
        latency: 1020,
        cost: "0.002800",
        rawResponse: '{"status":"FAIL","reasons":["Grammatical error: theyre","Competitor brand names mentioned","Unprofessional punctuation","PII detected: email"],"confidence":0.97}',
        preCheckResults: { blurScore: null, isDuplicate: false, piiDetected: true, piiItems: ["email"] },
      },
      {
        projectId: textProject.id,
        assetName: "newsletter-intro.txt",
        assetContent: "Welcome to our monthly newsletter! This month we are excited to share our latest collection, exclusive member discounts, and style tips from our in-house team. Read on to discover what's new.",
        assetType: "text",
        assetHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c4",
        validationResult: "PASS",
        reasons: [
          "Warm and professional tone",
          "Grammatically correct",
          "Clear preview of newsletter content",
          "Appropriate length and structure",
        ],
        confidence: "0.93",
        tokensUsed: 280,
        latency: 760,
        cost: "0.001900",
        rawResponse: '{"status":"PASS","reasons":["Warm and professional tone","Grammatically correct","Clear preview of newsletter content","Appropriate length"],"confidence":0.93}',
        preCheckResults: { blurScore: null, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: textProject.id,
        assetName: "flash-sale-copy.txt",
        assetContent: "FLASH SALE: 24 hours only! Get 30% off everything in store. Use code FLASH30 at checkout. Don't miss out — offer ends tonight at midnight.",
        assetType: "text",
        assetHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d5",
        validationResult: "PASS",
        reasons: [
          "Urgency and clear offer communicated effectively",
          "Call-to-action present: promo code and deadline",
          "No grammar issues",
          "No competitor references",
          "Concise and within word limit",
        ],
        confidence: "0.95",
        tokensUsed: 295,
        latency: 810,
        cost: "0.002000",
        rawResponse: '{"status":"PASS","reasons":["Urgency communicated","Clear CTA","No grammar issues","No competitor references","Concise"],"confidence":0.95}',
        preCheckResults: { blurScore: null, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
    ]);

    // Audio validations
    await db.insert(assetValidationsTable).values([
      {
        projectId: audioProject.id,
        assetName: "episode-42-intro.mp3",
        assetContent: "",
        assetType: "audio",
        assetHash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e6",
        validationResult: "PASS",
        reasons: [
          "Clear audio quality — no background noise detected",
          "Proper intro with host introduction",
          "Duration 34:22 — within 20-60 min range",
          "Outro present at end of recording",
        ],
        confidence: "0.92",
        tokensUsed: 540,
        latency: 1340,
        cost: "0.003800",
        rawResponse: '{"status":"PASS","reasons":["Clear audio quality","Proper intro","Duration within range","Outro present"],"confidence":0.92}',
        preCheckResults: { blurScore: null, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: audioProject.id,
        assetName: "episode-43-raw.mp3",
        assetContent: "",
        assetType: "audio",
        assetHash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f7",
        validationResult: "FAIL",
        reasons: [
          "Significant background noise throughout recording",
          "Outro is missing",
          "Audio levels inconsistent — peaks detected at 2:14 and 18:45",
        ],
        confidence: "0.88",
        tokensUsed: 610,
        latency: 1490,
        cost: "0.004300",
        rawResponse: '{"status":"FAIL","reasons":["Background noise","Missing outro","Inconsistent audio levels"],"confidence":0.88}',
        preCheckResults: { blurScore: null, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: audioProject.id,
        assetName: "episode-44-final.mp3",
        assetContent: "",
        assetType: "audio",
        assetHash: "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a2",
        validationResult: "PASS",
        reasons: [
          "High quality audio throughout",
          "Intro and outro both present",
          "Duration 47:05 — within allowed range",
          "No offensive content detected",
        ],
        confidence: "0.95",
        tokensUsed: 580,
        latency: 1380,
        cost: "0.004100",
        rawResponse: '{"status":"PASS","reasons":["High quality audio","Intro and outro present","Valid duration","No offensive content"],"confidence":0.95}',
        preCheckResults: { blurScore: null, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
    ]);

    // Video validations
    await db.insert(assetValidationsTable).values([
      {
        projectId: videoProject.id,
        assetName: "summer-ad-15s.mp4",
        assetContent: "",
        assetType: "video",
        assetHash: "a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3",
        validationResult: "PASS",
        reasons: [
          "16:9 aspect ratio confirmed",
          "Duration 15 seconds — within allowed range",
          "Brand logo visible at 0:02 and 0:13",
          "High quality audio throughout",
          "No competitor products detected",
        ],
        confidence: "0.96",
        tokensUsed: 720,
        latency: 1680,
        cost: "0.005400",
        rawResponse: '{"status":"PASS","reasons":["Correct aspect ratio","Valid duration","Brand logo visible","High quality audio","No competitors"],"confidence":0.96}',
        preCheckResults: { blurScore: 91.4, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: videoProject.id,
        assetName: "product-launch-60s.mp4",
        assetContent: "",
        assetType: "video",
        assetHash: "b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4",
        validationResult: "FAIL",
        reasons: [
          "Brand logo missing — not detected in any frame",
          "Competitor product visible at 0:34",
          "Audio quality drops significantly at 0:45",
        ],
        confidence: "0.90",
        tokensUsed: 690,
        latency: 1620,
        cost: "0.005100",
        rawResponse: '{"status":"FAIL","reasons":["Brand logo missing","Competitor visible","Audio quality drop"],"confidence":0.90}',
        preCheckResults: { blurScore: 85.7, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
      {
        projectId: videoProject.id,
        assetName: "retargeting-30s.mp4",
        assetContent: "",
        assetType: "video",
        assetHash: "c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5",
        validationResult: "PASS",
        reasons: [
          "Correct 16:9 aspect ratio",
          "Duration 30 seconds — compliant",
          "Brand logo appears at intro and outro",
          "Crystal clear audio quality",
          "No competitor references detected",
        ],
        confidence: "0.97",
        tokensUsed: 740,
        latency: 1720,
        cost: "0.005600",
        rawResponse: '{"status":"PASS","reasons":["Correct ratio","Valid duration","Brand logo at intro/outro","Clear audio","No competitors"],"confidence":0.97}',
        preCheckResults: { blurScore: 93.8, isDuplicate: false, piiDetected: false, piiItems: [] },
      },
    ]);

    logger.info("Seeded all mock data successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed data");
  }
}
