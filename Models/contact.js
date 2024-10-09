require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Configure DynamoDB Client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION, // Region from environment variables
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Create a DynamoDB Document Client for the simplified API
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

module.exports = dynamoDB;
