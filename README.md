# Node.js Backend with MongoDB on GCP

A production-ready Node.js backend API with MongoDB integration, designed to run on Google Cloud Platform (GCP).

## Project Structure

```
backend-nodejs-gcp/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection configuration
│   ├── controllers/
│   │   └── userController.js    # User business logic
│   ├── models/
│   │   └── User.js              # User schema/model
│   ├── routes/
│   │   ├── index.js             # Main router
│   │   └── userRoutes.js        # User routes
│   └── server.js                # Application entry point
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── .dockerignore                # Docker ignore rules
├── Dockerfile                   # Docker container configuration
├── app.yaml                     # App Engine configuration
├── cloudbuild.yaml              # Cloud Build configuration
└── package.json                 # Project dependencies
```

## Prerequisites

- Node.js 18+ installed
- MongoDB (local or MongoDB Atlas)
- GCP account with billing enabled
- Google Cloud SDK (gcloud CLI) installed

## Installation

1. **Install Node.js** (if not already installed):
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Update the values in `.env`:
     ```
     PORT=8080
     NODE_ENV=development
     MONGODB_URI=mongodb://localhost:27017/mydatabase
     API_VERSION=v1
     ```

## MongoDB Setup

### Option 1: Local MongoDB
Install MongoDB locally from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

### Option 2: MongoDB Atlas (Recommended for GCP)

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Whitelist your IP (or 0.0.0.0/0 for GCP services)
4. Get connection string and update `MONGODB_URI` in `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mydatabase?retryWrites=true&w=majority
   ```

## Running Locally

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:8080`

## API Endpoints

### Health Check
- **GET** `/` - Root health check
- **GET** `/api/v1/health` - API health check

### Users
- **GET** `/api/v1/users` - Get all users (with pagination)
  - Query params: `?page=1&limit=10&sort=-createdAt`
- **GET** `/api/v1/users/:id` - Get user by ID
- **POST** `/api/v1/users` - Create new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30
  }
  ```
- **PUT** `/api/v1/users/:id` - Update user
- **DELETE** `/api/v1/users/:id` - Delete user

## Deployment to GCP

### Option 1: Google App Engine

1. **Install Google Cloud SDK**:
   - Download from [cloud.google.com/sdk](https://cloud.google.com/sdk)

2. **Initialize gcloud**:
   ```bash
   gcloud init
   gcloud auth login
   ```

3. **Create a GCP project** (if needed):
   ```bash
   gcloud projects create YOUR-PROJECT-ID
   gcloud config set project YOUR-PROJECT-ID
   ```

4. **Set environment variables** (for production):
   ```bash
   gcloud app deploy app.yaml --set-env-vars="MONGODB_URI=your-mongodb-connection-string"
   ```

5. **Deploy**:
   ```bash
   gcloud app deploy
   ```

6. **View your app**:
   ```bash
   gcloud app browse
   ```

### Option 2: Google Cloud Run (Recommended)

1. **Enable required APIs**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   ```

2. **Build and deploy**:
   ```bash
   # Build the Docker image
   gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/backend-nodejs-gcp

   # Deploy to Cloud Run
   gcloud run deploy backend-nodejs-gcp \
     --image gcr.io/YOUR-PROJECT-ID/backend-nodejs-gcp \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="MONGODB_URI=your-mongodb-connection-string,NODE_ENV=production,API_VERSION=v1"
   ```

3. **Using Cloud Build (CI/CD)**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

### Option 3: Google Kubernetes Engine (GKE)

For more complex deployments, you can use GKE with the provided Dockerfile.

## Security Best Practices

1. **Use Secret Manager** for sensitive data:
   ```bash
   # Create secret
   echo -n "your-mongodb-uri" | gcloud secrets create mongodb-uri --data-file=-

   # Grant access to App Engine/Cloud Run
   gcloud secrets add-iam-policy-binding mongodb-uri \
     --member="serviceAccount:YOUR-PROJECT-ID@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

2. **Update MongoDB connection** to use Secret Manager
3. **Enable HTTPS** (automatically handled by App Engine/Cloud Run)
4. **Set up authentication** for your API endpoints
5. **Configure CORS** properly in production

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8080 |
| `NODE_ENV` | Environment (development/production) | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/mydatabase |
| `API_VERSION` | API version prefix | v1 |

## Testing the API

### Using curl:
```bash
# Health check
curl http://localhost:8080/

# Create user
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","age":30}'

# Get all users
curl http://localhost:8080/api/v1/users

# Get user by ID
curl http://localhost:8080/api/v1/users/USER_ID
```

### Using Postman:
Import the endpoints into Postman for easier testing.

## Monitoring and Logging

### GCP Console:
- View logs: Cloud Logging
- Monitor metrics: Cloud Monitoring
- View errors: Error Reporting

### View logs locally:
```bash
# App Engine
gcloud app logs tail -s default

# Cloud Run
gcloud run services logs read backend-nodejs-gcp --region=us-central1
```

## Troubleshooting

### MongoDB connection issues:
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Ensure network connectivity

### Port issues:
- Ensure PORT environment variable is set to 8080 for GCP
- Check if port is already in use locally

### Deployment failures:
- Check `gcloud` CLI is authenticated
- Verify project billing is enabled
- Review Cloud Build logs

## Cost Optimization

- **App Engine**: Use automatic scaling with appropriate instance classes
- **Cloud Run**: Pay per request, scales to zero when idle
- **MongoDB Atlas**: Use M0 (free tier) for development, scale up for production

## Next Steps

1. Add authentication (JWT, OAuth)
2. Implement rate limiting
3. Add request validation middleware
4. Set up CI/CD pipeline
5. Add unit and integration tests
6. Implement caching (Redis)
7. Add API documentation (Swagger/OpenAPI)

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
