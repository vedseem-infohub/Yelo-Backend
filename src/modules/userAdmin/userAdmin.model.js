const mongoose = require('mongoose');

const userAdminSchema = new mongoose.Schema(
  {
    full_name: {type: String,
        required: true,
        trim: true
    },
    email: {type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },
    phone: {type: String,
        required: true,
        trim: true
    },
    role: {type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    is_active: {type: Boolean,
        default: true
    },
    password: {type: String,
        required: true,
        trim: true
    },
    
  },
  {timestamps: true}
)

module.exports = mongoose.model('UserAdmin', userAdminSchema);