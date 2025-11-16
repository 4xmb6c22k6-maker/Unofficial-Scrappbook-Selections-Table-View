// Scrappbook Extension - Background Script
// Handles image fetching with CORS bypass

console.log('🚀 Scrappbook Background Script loaded');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'fetch_image') {
    console.log('📥 Background: Fetching image:', request.url.substring(0, 80) + '...');
    
    // Fetch image and convert to Base64
    fetchImageAsBase64(request.url)
      .then(base64 => {
        console.log('✅ Background: Image fetched successfully:', base64.length, 'chars');
        sendResponse({ success: true, base64: base64 });
      })
      .catch(error => {
        console.error('❌ Background: Fetch failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'fetch_images_batch') {
    console.log('📥 Background: Batch fetching', request.urls.length, 'images');
    
    // Fetch all images in parallel
    Promise.all(request.urls.map(url => fetchImageAsBase64(url)))
      .then(base64Array => {
        console.log('✅ Background: All images fetched');
        sendResponse({ success: true, images: base64Array });
      })
      .catch(error => {
        console.error('❌ Background: Batch fetch failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});

// Fetch image and convert to Base64
async function fetchImageAsBase64(url) {
  try {
    // Background script can bypass CORS with host_permissions!
    const response = await fetch(url, {
      credentials: 'include',
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Get image as blob
    const blob = await response.blob();
    
    // Convert blob to Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}
