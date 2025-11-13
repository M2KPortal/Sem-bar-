// GitHub API integration for syncing POS data

/**
 * Save data to GitHub repository
 * @param {string} token - GitHub Personal Access Token
 * @param {string} owner - Repository owner/organization
 * @param {string} repo - Repository name
 * @param {string} path - File path in the repository (e.g., 'data/pos-backup.json')
 * @param {object} data - Data to save
 * @param {string} message - Commit message
 * @returns {Promise<object>} - Response from GitHub API
 */
export async function saveToGitHub(token, owner, repo, path, data, message = 'Update POS data') {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // First, try to get the current file to get its SHA (required for updates)
    let sha = null;
    try {
      const getResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist yet, that's OK
      console.log('File does not exist yet, will create new file');
    }

    // Convert data to base64
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

    // Create or update the file
    const payload = {
      message,
      content,
      ...(sha && { sha }), // Include SHA if updating existing file
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save to GitHub');
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub sync error:', error);
    throw error;
  }
}

/**
 * Load data from GitHub repository
 * @param {string} token - GitHub Personal Access Token
 * @param {string} owner - Repository owner/organization
 * @param {string} repo - Repository name
 * @param {string} path - File path in the repository
 * @returns {Promise<object>} - Parsed JSON data
 */
export async function loadFromGitHub(token, owner, repo, path) {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Backup file not found on GitHub');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to load from GitHub');
    }

    const fileData = await response.json();

    // Decode base64 content
    const content = decodeURIComponent(escape(atob(fileData.content)));
    return JSON.parse(content);
  } catch (error) {
    console.error('GitHub load error:', error);
    throw error;
  }
}

/**
 * Verify GitHub credentials and repository access
 * @param {string} token - GitHub Personal Access Token
 * @param {string} owner - Repository owner/organization
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>} - True if credentials are valid
 */
export async function verifyGitHubAccess(token, owner, repo) {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('GitHub verification error:', error);
    return false;
  }
}

/**
 * Parse GitHub repository URL to extract owner and repo
 * @param {string} url - GitHub repository URL
 * @returns {object|null} - Object with owner and repo, or null if invalid
 */
export function parseGitHubUrl(url) {
  try {
    // Handle various URL formats:
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    // owner/repo

    let cleanUrl = url.trim();

    // Remove .git suffix if present
    cleanUrl = cleanUrl.replace(/\.git$/, '');

    // Extract owner/repo pattern
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/]+)/,  // HTTPS or SSH
      /^([^/]+)\/([^/]+)$/,                // Just owner/repo
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
