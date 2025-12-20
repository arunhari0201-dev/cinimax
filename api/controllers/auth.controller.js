import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import { errorHandler } from '../utils/error.js';
import jwt from 'jsonwebtoken';

export const signup = async (req, res, next) => {
  const { username, email, password } = req.body;
  
  // Input validation
  if (!username || !email || !password) {
    return next(errorHandler(400, 'Username, email, and password are required'));
  }
  
  if (password.length < 6) {
    return next(errorHandler(400, 'Password must be at least 6 characters long'));
  }
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return next(errorHandler(400, 'Email already exists'));
      }
      if (existingUser.username === username) {
        return next(errorHandler(400, 'Username already exists'));
      }
    }
    
    const hashedPassword = bcryptjs.hashSync(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return next(errorHandler(400, `${duplicateField} already exists`));
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(errorHandler(400, messages.join(', ')));
    }
    
    next(error);
  }
};

export const signin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const validUser = await User.findOne({ email });
    if (!validUser) return next(errorHandler(404, 'User not found'));
    
    // Check if this is an OAuth user trying to sign in with password
    if (validUser.isOAuthUser) {
      return next(errorHandler(400, 'This account uses Google sign-in. Please use the Google sign-in button.'));
    }
    
    // Check password for non-OAuth users
    if (!validUser.password) {
      return next(errorHandler(400, 'Invalid account configuration. Please contact support.'));
    }
    
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) return next(errorHandler(401, 'wrong credentials'));
    
    // Update last login
    validUser.lastLogin = new Date();
    await validUser.save();
    
    const token = jwt.sign({ id: validUser._id }, process.env.JWT_SECRET);
    const { password: hashedPassword, ...rest } = validUser._doc;
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Cookie settings for production
    const cookieOptions = {
      httpOnly: true,
      expires: expiryDate,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site in production
    };
    
    res
      .cookie('access_token', token, cookieOptions)
      .status(200)
      .json({ ...rest, token });
  } catch (error) {
    next(error);
  }
};

export const google = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      const { password: hashedPassword, ...rest } = user._doc;
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Cookie settings for production
      const cookieOptions = {
        httpOnly: true,
        expires: expiryDate,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      };
      
      res
        .cookie('access_token', token, cookieOptions)
        .status(200)
        .json({ ...rest, token });
    } else {
      const newUser = new User({
        username:
          req.body.name.split(' ').join('').toLowerCase() +
          Math.random().toString(36).slice(-8),
        email: req.body.email,
        profilePicture: req.body.photo,
        isOAuthUser: true,
        lastLogin: new Date()
      });
      await newUser.save();
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
      const { password: hashedPassword2, ...rest } = newUser._doc;
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Cookie settings for production
      const cookieOptions = {
        httpOnly: true,
        expires: expiryDate,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      };
      
      res
        .cookie('access_token', token, cookieOptions)
        .status(200)
        .json({ ...rest, token });
    }
  } catch (error) {
    next(error);
  }
};

export const signout = (req, res) => {
  res.clearCookie('access_token').clearCookie('token').status(200).json('Signout success!');
};

export const refreshToken = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    // First try to get user from the request body
    if (userId) {
      // Find the user by ID
      const user = await User.findById(userId);
      if (user) {
        // Generate new token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const { password: hashedPassword, ...rest } = user._doc;
        
        // Cookie settings for production
        const cookieOptions = {
          httpOnly: true,
          expires: expiryDate,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        };
        
        res
          .cookie('access_token', token, cookieOptions)
          .status(200)
          .json(rest);
          
        return;
      }
    }
    
    // If no userId or user not found by ID, try to get from existing token
    const token = req.cookies.access_token || req.cookies.token;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user) {
          // Generate new token
          const newToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
          const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          
          const { password: hashedPassword, ...rest } = user._doc;
          
          // Cookie settings for production
          const cookieOptions = {
            httpOnly: true,
            expires: expiryDate,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          };
          
          res
            .cookie('access_token', newToken, cookieOptions)
            .status(200)
            .json(rest);
            
          return;
        }
      } catch (err) {
        // Token verification failed, continue to error
      }
    }
    
    // If we get here, no valid user was found
    return next(errorHandler(400, 'Unable to refresh token - no valid user found'));
  } catch (error) {
    next(error);
  }
};

export const validateToken = async (req, res, next) => {
  try {
    const token = req.cookies.access_token || req.cookies.token;

    if (!token) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        // Clear invalid token
        res.clearCookie('access_token');
        res.clearCookie('token');
        return res.status(401).json({ valid: false, message: 'Invalid or expired token' });
      }

      // Check if user still exists
      const user = await User.findById(decoded.id);
      if (!user) {
        res.clearCookie('access_token');
        res.clearCookie('token');
        return res.status(401).json({ valid: false, message: 'User not found' });
      }

      const { password: hashedPassword, ...rest } = user._doc;
      res.status(200).json({ valid: true, user: rest });
    });
  } catch (error) {
    next(error);
  }
};

export const validateSession = async (req, res, next) => {
  try {
    console.log('🔍 Session validation request:', {
      cookies: req.cookies,
      authHeader: req.headers.authorization ? 'present' : 'absent'
    });
    
    // Check for token in cookies first, then in Authorization header
    let token = req.cookies.access_token || req.cookies.token;
    
    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('📍 Token found in Authorization header');
      }
    }

    if (!token) {
      console.log('❌ No token found in cookies or Authorization header');
      return res.status(401).json({ valid: false, message: 'No session found' });
    }

    console.log('✅ Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive:', { userId: decoded.id, userExists: !!user, isActive: user?.isActive });
      res.clearCookie('access_token');
      res.clearCookie('token');
      return res.status(401).json({ valid: false, message: 'Invalid session' });
    }

    console.log('✅ Session validation successful for user:', user.username);
    const { password: hashedPassword, ...rest } = user._doc;
    res.status(200).json({ valid: true, user: rest });
  } catch (error) {
    console.error('❌ Session validation error:', error.message);
    res.clearCookie('access_token');
    res.clearCookie('token');
    res.status(401).json({ valid: false, message: 'Session validation failed' });
  }
};