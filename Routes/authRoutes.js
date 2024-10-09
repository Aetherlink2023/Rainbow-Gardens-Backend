const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const authenticateJWT = require("../middleware/authenticateJWT");

// Importing Controllers
const contactController = require('../Controllers/contactController');
const productController = require('../Controllers/productController');
const loginController = require('../Controllers/loginController');
const authController = require('../Controllers/authController');


// Contact APIs
router.post('/createcontact', contactController.createContact);
router.get('/getcontact', contactController.getAllContacts);

// Product APIs
router.post('/createproduct', authenticateJWT, upload.array('images'), productController.createProduct);
router.get('/getproduct', productController.getAllProducts);
router.get('/getplantname/:plantName', productController.getProductByName);
router.get('/getproduct/:Pno', productController.getProductByPno);
router.put('/updateproducts/:Pno', authenticateJWT, upload.array('images'), productController.updateProduct);
router.delete('/deleteproducts/:Pno', authenticateJWT, productController.deleteProduct);


// Login APIs
router.post('/login', loginController.login);
router.post('/signup', loginController.signup);

// Authentication using email
router.post('/send-verification-email', authController.initiatePasswordReset);
router.post('/verify-code', authController.resetPassword);

module.exports = router;
