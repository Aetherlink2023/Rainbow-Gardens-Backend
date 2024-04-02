const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



const contactController = require('../Controllers/contactController');
const productController = require('../Controllers/productController');
const cartController = require('../Controllers/cartController');
const loginController = require('../Controllers/loginController');
const addtocart = require('../Controllers/addcartController')



// Contact APIs
router.post('/createcontact', contactController.createContact);
router.get('/getcontact', contactController.getAllContacts);



// Product APIs
router.post('/createproduct', upload.array('images'), productController.createProduct);
router.get('/getproduct', productController.getAllProducts);
router.get('/getplantname/:plantName', productController.getProductByName);
router.get('/getproduct/:Pno', productController.getProductByPno);
router.put('/updateproducts/:Pno', productController.updateProduct);
router.delete('/deleteproducts/:Pno', productController.deleteProduct);



// Cart APIs
router.get('/additemtocart', addtocart.getAddCartPlantDetails)
router.get('/additemtocart/:Pno', addtocart.getaddcartPlantDetailsByPno)
router.post('/addtocart', cartController.addToCart);
router.get('/getAllCartItems', cartController.getAllCartItems);

// Login APIs
router.post('/login', loginController.login);
router.post('/signup', loginController.signup);

module.exports = router;
