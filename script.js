// Configuration
const API_BASE_URL = 'https://analytics-dashboard-backend-eccy.onrender.com'; // Change this to your backend URL

// Global variables to store chart instances
let charts = {};

// Show status message
function showStatus(message, type = 'success') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
}

// Update last updated timestamp
function updateLastUpdated(timestamp) {
  const lastUpdated = document.getElementById('lastUpdated');
  lastUpdated.textContent = `Last updated: ${timestamp || new Date().toLocaleString()}`;
}

// Fetch data from Google Analytics API
async function fetchAnalyticsData() {
  const refreshBtn = document.getElementById('refreshBtn');
  const refreshIcon = document.getElementById('refreshIcon');
  
  try {
    refreshBtn.disabled = true;
    refreshIcon.classList.add('loading');
    
    showStatus('Fetching latest data from Google Analytics...', 'success');
    
    const response = await fetch(`${API_BASE_URL}/api/analytics-data`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    showStatus(`Error: ${error.message}`, 'error');
    throw error;
  } finally {
    refreshBtn.disabled = false;
    refreshIcon.classList.remove('loading');
  }
}

// Render summary cards
function renderSummary(data) {
  if (!data || !data.cityData || !data.trafficSources || !data.platforms) {
    console.warn('Invalid data for summary rendering:', data);
    return;
  }
  
  const { cityData, trafficSources, platforms } = data;
  
  const totalUsers = cityData.reduce((sum, r) => sum + r.users, 0);
  const totalSessions = cityData.reduce((sum, r) => sum + r.sessions, 0);
  const avgBounce = cityData.reduce((sum, r) => sum + r.bounceRate, 0) / cityData.length;
  
  // Sort cityData by pageviews in descending order and get the most active city
  const mostActiveCityEntry = [...cityData].sort((a, b) => b.pageviews - a.pageviews)[0];
  const mostActiveCity = mostActiveCityEntry ? mostActiveCityEntry.city : '–';
  
  // Update card titles and content
  document.getElementById('totalUsers').textContent = totalUsers.toLocaleString();
  document.getElementById('totalSessions').textContent = totalSessions.toLocaleString();
  document.getElementById('avgBounce').textContent = (avgBounce * 100).toFixed(1) + '%';
  const topCityElement = document.getElementById('topCity');
  topCityElement.textContent = mostActiveCity;
  topCityElement.parentElement.querySelector('h2').textContent = 'Most Active City'; // Assuming h2 is the title
}

// Destroy existing charts
function destroyCharts() {
  Object.values(charts).forEach(chart => {
    if (chart) {
      chart.destroy();
      chart = null; // Explicitly nullify to release reference
    }
  });
  charts = {}; // Reset the charts object
}

// Render all charts
function renderCharts(data) {
  if (!data || !data.cityData || !data.trafficSources || !data.platforms || !data.locationData) {
    console.warn('Invalid data for chart rendering:', data);
    return;
  }
  
  destroyCharts();

  const { cityData, trafficSources, platforms, locationData } = data;

  // Chart 1: Users & Sessions by City
  const ctx1 = document.getElementById('usersSessionsChart').getContext('2d');
  charts.usersessions = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: cityData.map(r => r.city),
      datasets: [
        {
          label: 'Total Users',
          data: cityData.map(r => r.users),
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
        },
        {
          label: 'Sessions',
          data: cityData.map(r => r.sessions),
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim()
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 0,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Chart 2: Bounce Rate by City
  const ctx2 = document.getElementById('bounceChart').getContext('2d');
  charts.bounce = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: cityData.map(r => r.city),
      datasets: [{
        label: 'Bounce Rate',
        data: cityData.map(r => r.bounceRate),
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--danger').trim(),
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--danger').trim() + '20',
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 0,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 1, ticks: { callback: v => (v * 100).toFixed(0) + '%' } }
      }
    }
  });

  // Chart 3: Views by City
  const ctx3 = document.getElementById('viewsChart').getContext('2d');
  charts.views = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: cityData.map(r => r.city),
      datasets: [{
        label: 'Page Views',
        data: cityData.map(r => r.pageviews),
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 0,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Chart 4: Traffic Sources
  const ctx4 = document.getElementById('trafficSourceChart').getContext('2d');
  charts.trafficsource = new Chart(ctx4, {
    type: 'doughnut',
    data: {
      labels: trafficSources.map(r => r.source),
      datasets: [{
        data: trafficSources.map(r => r.sessions),
        backgroundColor: ['#00796b', '#ff9800', '#3f51b5', '#f44336', '#4caf50', '#9c27b0']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 0,
      plugins: { legend: { position: 'right' } }
    }
  });

  // Chart 5: Traffic by Platform
  const ctx5 = document.getElementById('trafficPlatformChart').getContext('2d');
  charts.platform = new Chart(ctx5, {
    type: 'pie',
    data: {
      labels: platforms.map(r => r.platform),
      datasets: [{
        data: platforms.map(r => r.sessions),
        backgroundColor: ['#00796b', '#ff9800', '#3f51b5']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 0,
      plugins: { legend: { position: 'bottom' } }
    }
  });

  // Chart 6: Views by Location (Country/Region)
  const ctx6 = document.getElementById('viewsLocationChart').getContext('2d');
  charts.location = new Chart(ctx6, {
    type: 'bar',
    data: {
      labels: locationData.map(r => r.location),
      datasets: [{
        label: 'Page Views',
        data: locationData.map(r => r.pageviews),
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 0,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// Load and render data
async function loadData() {
  try {
    const data = await fetchAnalyticsData();
    console.log('Fetched data:', data); // Debug: Log the fetched data
    if (data && data.cityData && data.trafficSources && data.platforms && data.locationData) {
      renderSummary(data);
      renderCharts(data);
      updateLastUpdated(data.lastUpdated); // Use API-provided timestamp
      showStatus('Dashboard updated successfully!', 'success');
    } else {
      console.warn('Invalid data structure:', data);
      showDemoData();
    }
  } catch (error) {
    console.error('Failed to load data:', error);
    showDemoData();
  }
}

// Show demo data when API is not available
function showDemoData() {
  const demoData = {
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
      { source: 'Social', sessions: 987 },
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
    lastUpdated: new Date().toISOString() // Mock timestamp for demo
  };
  
  renderSummary(demoData);
  renderCharts(demoData);
  updateLastUpdated(demoData.lastUpdated);
  showStatus('Showing demo data - check console for API connection details', 'error');
}

// Event listeners
document.getElementById('refreshBtn').addEventListener('click', loadData);

// Initial load
document.addEventListener('DOMContentLoaded', loadData);