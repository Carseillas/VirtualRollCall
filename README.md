# VirtualRollCall �

A comprehensive attendance management system for schools, built with Node.js and React.

## Features ✨

- **Teacher Dashboard**: Easy attendance taking interface
- **Principal Dashboard**: Complete administrative control
- **Real-time Updates**: Live attendance synchronization with Socket.IO
- **PDF Reports**: Generate printable attendance reports
- **Role-based Access**: Secure authentication and authorization
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack �️

### Backend
- Node.js & Express.js
- Socket.IO for real-time features
- JWT authentication
- Puppeteer for PDF generation
- bcrypt for password hashing

### Frontend
- React.js with modern hooks
- React Router for navigation
- Socket.IO client for real-time updates
- Axios for API calls
- CSS3 with custom design system

## Quick Start �

1. **Clone and setup the project:**
   ```bash
   # If you haven't run the setup script yet:
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Demo Credentials �

### Principal Account
- Username: `admin`
- Password: `admin123`
- Features: Full administrative access

### Teacher Account
- Username: `teacher1`
- Password: `teacher123`
- Features: Attendance taking, class management

## Project Structure �

```
VirtualRollCall/
├── backend/              # Node.js API server
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Authentication & validation
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.js        # Main server file
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # State management
│   │   ├── services/    # API services
│   │   └── styles/      # CSS styles
└── docs/               # Documentation
```

## Available Scripts �

- `npm run dev` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run install-all` - Install all dependencies

## Development Workflow �

1. **Backend Development**: The API server runs on port 5000
2. **Frontend Development**: React dev server on port 3000
3. **Real-time Features**: Socket.IO handles live updates
4. **Database**: Currently uses in-memory storage (easily replaceable)

## Features Roadmap �️

- [ ] MongoDB/PostgreSQL integration
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced reporting & analytics
- [ ] Multi-school support
- [ ] Parent portal
- [ ] Backup & restore functionality

## Contributing �

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License �

This project is licensed under the MIT License - see the LICENSE file for details.

## Support ��

If you encounter any issues or have questions:

1. Check the documentation in the `docs/` folder
2. Review the demo credentials above
3. Ensure all dependencies are installed
4. Check the browser console for errors
5. Verify backend server is running on port 5000

---

**Happy Teaching! �‍��‍��**
