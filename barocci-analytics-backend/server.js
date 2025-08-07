// server.js - Backend API for Google Analytics integration
const express = require('express');
const cors = require('cors');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
require('dotenv').config();

const app = express();

// Environment variable validation
const requiredEnvVars = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GA_PROPERTY_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set these environment variables in your Render dashboard');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: ['https://leafy-cobbler-d7fef1.netlify.app', 'https://leafy-cobbler-d7fef1.netlify.app/'] // Allow both with and without trailing slash
}));
app.use(express.json());

// Initialize Google Analytics client
let analyticsDataClient;
try {
  analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
  });
  console.log('✅ Google Analytics client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Google Analytics client:', error.message);
  process.exit(1);
}

const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID;

// Helper function to run GA4 reports
async function runReport(dimensions, metrics, dateRanges = [{ startDate: '30daysAgo', endDate: 'today' }]) {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges,
      dimensions,
      metrics,
      orderBys: [{ metric: { metricName: metrics[0].name }, desc: true }],
      limit: 10,
    });
    return response;
  } catch (error) {
    console.error('Error running GA4 report:', error.message);
    throw error;
  }
}

// ✅ API Routes
app.get('/api/analytics-data', async (req, res) => {
  try {
    console.log('📊 Fetching analytics data...');

    const cityReport = await runReport(
      [{ name: 'city' }],
      [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'screenPageViews' }
      ]
    );

    const trafficSourceReport = await runReport(
      [{ name: 'sessionDefaultChannelGroup' }],
      [{ name: 'sessions' }]
    );

    const platformReport = await runReport(
      [{ name: 'deviceCategory' }],
      [{ name: 'sessions' }]
    );

    const locationReport = await runReport(
      [{ name: 'country' }],
      [{ name: 'screenPageViews' }]
    );

    const cityData = cityReport.rows?.map(row => ({
      city: row.dimensionValues[0].value || 'Unknown',
      users: parseInt(row.metricValues[0].value) || 0,
      sessions: parseInt(row.metricValues[1].value) || 0,
      bounceRate: parseFloat(row.metricValues[2].value) || 0,
      pageviews: parseInt(row.metricValues[3].value) || 0
    })) || [];

    const trafficSources = trafficSourceReport.rows?.map(row => ({
      source: row.dimensionValues[0].value || 'Unknown',
      sessions: parseInt(row.metricValues[0].value) || 0
    })) || [];

    const platforms = platformReport.rows?.map(row => ({
      platform: row.dimensionValues[0].value || 'Unknown',
      sessions: parseInt(row.metricValues[0].value) || 0
    })) || [];

    const locationData = locationReport.rows?.map(row => ({
      location: row.dimensionValues[0].value || 'Unknown',
      pageviews: parseInt(row.metricValues[0].value) || 0
    })) || [];

    const responseData = {
      cityData,
      trafficSources,
      platforms,
      locationData,
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Analytics data fetched successfully');
    res.json(responseData);

  } catch (error) {
    console.error('❌ Error fetching analytics data:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics data',
      message: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: {
      hasGoogleClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasGooglePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasGAPropertyId: !!process.env.GA_PROPERTY_ID
    }
  });
});

app.get('/api/test-data', (req, res) => {
  const sampleData = {
    cityData: [
      { city: 'New York', users: 1250, sessions: 1890, bounceRate: 0.45, pageviews: 3450 },
      { city: 'London', users: 980, sessions: 1456, bounceRate: 0.52, pageviews: 2890 },
      { city: 'Tokyo', users: 756, sessions: 1123, bounceRate: 0.38, pageviews: 2234 },
      { city: 'Sydney', users: 543, sessions: 798, bounceRate: 0.48, pageviews: 1567 },
      { city: 'Paris', users: 432, sessions: 645, bounceRate: 0.41, pageviews: 1234 }
    ],
    trafficSources: [
      { source: 'Organic Search', sessions: 2456 },
      { source: 'Direct', sessions: 1789 },
      { source: 'Social Media', sessions: 987 },
      { source: 'Email', sessions: 654 },
      { source: 'Referral', sessions: 432 }
    ],
    platforms: [
      { platform: 'Desktop', sessions: 3567 },
      { platform: 'Mobile', sessions: 2789 },
      { platform: 'Tablet', sessions: 456 }
    ],
    locationData: [
      { location: 'United States', pageviews: 4567 },
      { location: 'United Kingdom', pageviews: 3234 },
      { location: 'Canada', pageviews: 2456 },
      { location: 'Australia', pageviews: 1789 },
      { location: 'Germany', pageviews: 1234 }
    ],
    lastUpdated: new Date().toISOString()
  };

  res.json(sampleData);
});

// Optional: Root route
app.get('/', (req, res) => {
  res.send('📡 Barocci Analytics API is up and running.');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export for Render serverless
module.exports = app;