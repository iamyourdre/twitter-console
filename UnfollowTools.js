/**
 * Twitter Unfollow Script
 *
 * This script automates the process of unfollowing accounts that do not follow you back on X (formerly Twitter).
 * It is designed to be run in the browser's developer console.
 *
 * Use at your own risk. This script violates the platform's terms of service. Excessive use may result in
 * account suspension or rate-limiting.
 */

(function () {
  // A global variable to control the unfollow process.
  // Set to `true` to stop the script safely.
  window.stopUnfollowScript = false;
  let unfollowedCount = 0;

  // Function to create and show a message box on the screen
  function showMessage(message, type = 'info') {
    let messageBox = document.getElementById('unfollow-message-box');
    if (!messageBox) {
      messageBox = document.createElement('div');
      messageBox.id = 'unfollow-message-box';
      Object.assign(messageBox.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '9999',
        padding: '12px 20px',
        borderRadius: '8px',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        transition: 'opacity 0.3s ease-in-out',
        minWidth: '250px',
        textAlign: 'center'
      });
      document.body.appendChild(messageBox);
    }

    let bgColor = '';
    if (type === 'info') {
      bgColor = '#1da1f2'; // Blue
    } else if (type === 'success') {
      bgColor = '#17bf63'; // Green
    } else if (type === 'error') {
      bgColor = '#e0245e'; // Red
    }

    messageBox.style.backgroundColor = bgColor;
    messageBox.innerText = message;
    messageBox.style.opacity = '1';

    // Hide the message after 5 seconds
    setTimeout(() => {
      messageBox.style.opacity = '0';
    }, 5000);
  }

  // A helper function to wait for a specific amount of time
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // The main unfollow function
  const unfollow = async () => {
    let lastUserCount = 0;
    while (!window.stopUnfollowScript) {
      const userRows = document.querySelectorAll('div.css-175oi2r.r-1awozwy.r-18u37iz.r-1wtj0ep');
      
      if (userRows.length === lastUserCount) {
        showMessage(`Finished loading. Found ${userRows.length} total accounts.`, 'info');
        console.log(`Finished loading. Found ${userRows.length} total accounts.`);
        break; // We've reached the end of the list
      }
      
      lastUserCount = userRows.length;
      
      showMessage(`Processing ${userRows.length} accounts...`, 'info');

      for (const row of userRows) {
        if (window.stopUnfollowScript) {
          showMessage(`Script stopped. Total unfollows: ${unfollowedCount}`, 'info');
          console.log(`Script stopped. Total unfollows: ${unfollowedCount}`);
          return;
        }

        const followsYouIndicator = row.querySelector('[data-testid="userFollowIndicator"]');
        
        if (!followsYouIndicator) {
          const unfollowButton = row.querySelector('button[data-testid$="-unfollow"]');
          if (unfollowButton) {
            const unfollowButtonLabel = unfollowButton.getAttribute('aria-label');
            const username = unfollowButtonLabel ? unfollowButtonLabel.replace('Following ', '') : 'Unknown User';

            console.log(`Unfollowing ${username}...`);
            unfollowButton.click();
            
            await sleep(500);

            const confirmButton = document.querySelector('button[data-testid="confirmationSheetConfirm"]');
            if (confirmButton) {
              confirmButton.click();
              unfollowedCount++;
              console.log(`Successfully unfollowed ${username}`);
              showMessage(`Unfollowed ${unfollowedCount} accounts so far.`, 'success');
            } else {
              console.error('Confirmation button not found.');
            }

            const delay = 500 + Math.random() * 1500;
            await sleep(delay);
          }
        }
      }
      
      // Scroll down to load more users
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(2000); // Wait for new content to load
    }
    
    showMessage(`Finished! Total unfollows: ${unfollowedCount}`, 'success');
    console.log(`Finished! Total unfollows: ${unfollowedCount}`);
  };

  // Start the unfollow process
  unfollow();
  showMessage('Unfollow script started. To stop, type `window.stopUnfollowScript = true;` in the console and press Enter.', 'info');
})();
