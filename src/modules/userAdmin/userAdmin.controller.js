const UserAdmin = require('./userAdmin.model');
const jwt = require('jsonwebtoken');

async function createAdminUser(req, res) {
   try {
    const {full_name, email, phone, role, is_active, password} = req.body;
    
    // Normalize email to lowercase
    const normalizedEmail = email ? email.trim().toLowerCase() : email;
    
    const userAdmin = new UserAdmin({
        full_name,
        email: normalizedEmail,
        phone,
        role,
        is_active,
        password
    });
    await userAdmin.save();
    res.status(201).json({message: 'User created successfully'});
   } catch (error) {
    console.error('Error in createAdminUser:', error);
    if (error.code === 11000) {
        return res.status(400).json({message: 'Email already exists'});
    }
    res.status(500).json({message: 'Internal server error'});
   }
}

async function getAllUsers(req, res) {
    try {
        const users = await UserAdmin.find();
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({message: 'Internal server error'});
    }
}

async function deleteUser(req, res) {
    try {
        const {id} = req.params;
        const user = await UserAdmin.findByIdAndDelete(id);
        res.status(200).json({message: 'User deleted successfully'});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: 'Internal server error'});
    }
}

async function updateAdminUser(req, res) {
    try {
        const {id} = req.params;
        const updates = req.body;
        const user = await UserAdmin.findByIdAndUpdate(id, {$set: updates}, {new: true});
        res.status(200).json({message: 'User updated successfully'});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: 'Internal server error'});
    }
}

async function loginAdminUser(req, res) {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user with case-insensitive email (handles both old and new email formats)
        const normalizedEmail = email.trim();
        const user = await UserAdmin.findOne({ 
            email: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.is_active) {
            return res.status(403).json({ message: 'Account is inactive' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ message: 'Internal server error: Security configuration missing' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`User logged in successfully: ${email}`);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error in loginAdminUser:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

module.exports = {createAdminUser, getAllUsers, deleteUser, updateAdminUser, loginAdminUser};