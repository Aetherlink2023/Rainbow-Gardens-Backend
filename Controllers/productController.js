require("dotenv").config();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const dynamoDB = require('../Models/contact'); 

// Initialize S3 and DynamoDB clients
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);

// Upload images to S3
const uploadImages = async (files) => {
  try {
    console.log("Uploading files:", files);

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const { originalname, buffer, mimetype } = file;
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          ACL: "public-read",
          ContentType: mimetype,
          Key: `${Date.now()}-${originalname}`,
          Body: buffer,
        };

        const command = new PutObjectCommand(params);
        const uploadResult = await s3.send(command);
        console.log("Uploaded File:", uploadResult);

        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
      })
    );

    console.log("All Uploaded Files:", uploadedFiles);
    return uploadedFiles;
  } catch (error) {
    console.error("Error uploading images:", error);
    throw error;
  }
};

const generateRandomNumber = () => Math.floor(10000 + Math.random() * 90000).toString();

// Create product with image upload
const createProduct = async (req, res) => {
  try {
    const {
      plantName,
      plantSmallDescription,
      plantPrice,
      plantLongDescription,
      plantDescriptionForCard,
      category,
    } = req.body;
    const Pno = generateRandomNumber();

    const imageUrls = await uploadImages(req.files);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Item: {
        Pno,
        plantName,
        plantSmallDescription,
        plantPrice,
        plantLongDescription,
        plantDescriptionForCard,
        category,
        images: imageUrls,
      },
    };

    await dynamoDBDocumentClient.send(new PutCommand(params));
    res.status(201).json({ message: "Product created successfully", product: params.Item });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { Pno } = req.params;
    const {
      plantName,
      plantSmallDescription,
      plantPrice,
      plantLongDescription,
      plantDescriptionForCard,
      category,
    } = req.body;

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await uploadImages(req.files);
    }

    let updateExpression = "set plantName = :n, plantSmallDescription = :sd, plantPrice = :p, plantLongDescription = :ld, plantDescriptionForCard = :dc, category = :cat";
    const expressionAttributeValues = {
      ":n": plantName,
      ":sd": plantSmallDescription,
      ":p": plantPrice,
      ":ld": plantLongDescription,
      ":dc": plantDescriptionForCard,
      ":cat": category,
    };

    if (imageUrls.length > 0) {
      updateExpression += ", images = :img";
      expressionAttributeValues[":img"] = imageUrls;
    }

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: { Pno },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "UPDATED_NEW",
    };

    const data = await dynamoDBDocumentClient.send(new UpdateCommand(params));
    res.status(200).json({ message: "Product updated successfully", updatedProduct: data.Attributes });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      ...(category && {
        FilterExpression: "category = :category",
        ExpressionAttributeValues: { ":category": category },
      }),
    };

    const data = await dynamoDBDocumentClient.send(new ScanCommand(params));
    res.status(200).json(data.Items);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get product by Pno
const getProductByPno = async (req, res) => {
  try {
    const { Pno } = req.params;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: { Pno },
    };

    const data = await dynamoDBDocumentClient.send(new GetCommand(params));

    if (!data.Item) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(data.Item);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get product by name
const getProductByName = async (req, res) => {
  try {
    const { plantName } = req.params;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      FilterExpression: "begins_with(plantName, :name)",
      ExpressionAttributeValues: { ":name": plantName },
    };

    const data = await dynamoDBDocumentClient.send(new ScanCommand(params));

    if (data.Items.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json(data.Items);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { Pno } = req.params;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_PRODUCTS,
      Key: { Pno },
    };

    await dynamoDBDocumentClient.send(new DeleteCommand(params));
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductByPno,
  getProductByName,
  updateProduct,
  deleteProduct,
};
