const UserAdmin = require('./userAdmin.model');
const jwt = require('jsonwebtoken');

async function createAdminUser(req, res) {
   try {
    const {full_name, email, phone, role, is_active, password} = req.body;
    const userAdmin = new UserAdmin({
        full_name,
        email,
        phone,
        role,
        is_active,
        password
    });
    await userAdmin.save();
    res.status(201).json({message: 'User created successfully'});
   } catch (error) {
    console.log(error);
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
        const user = await UserAdmin.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.is_active) {
            return res.status(403).json({ message: 'Account is inactive' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

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
        console.log(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {createAdminUser, getAllUsers, deleteUser, updateAdminUser, loginAdminUser};