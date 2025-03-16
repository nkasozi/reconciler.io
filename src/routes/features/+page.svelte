<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>Features | Reconcile - Data Reconciliation Made Simple</title>
  <meta name="description" content="Powerful features for seamless data reconciliation across all your systems." />
</svelte:head>

<div class="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-16">
  <div class="container mx-auto px-4">
    <div class="text-center mb-16">
      <h1 class="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
        Powerful Features for <span class="text-blue-600 dark:text-blue-400">Modern Data Reconciliation</span>
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
        From intelligent column mapping to detailed discrepancy analysis, our tool empowers you to reconcile data with confidence.
      </p>
    </div>

    <!-- Feature Categories -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
      <!-- Category 1 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transform transition duration-300 hover:scale-105">
        <div class="h-14 w-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          Intuitive Data Mapping
        </h3>
        <p class="text-gray-600 dark:text-gray-300">
          Effortlessly map columns between files with our drag-and-drop interface. Save your mappings for future use.
        </p>
      </div>

      <!-- Category 2 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transform transition duration-300 hover:scale-105">
        <div class="h-14 w-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          Real-time Reconciliation
        </h3>
        <p class="text-gray-600 dark:text-gray-300">
          Watch your data reconcile in real-time with our high-performance matching engine. See progress updates as they happen.
        </p>
      </div>

      <!-- Category 3 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transform transition duration-300 hover:scale-105">
        <div class="h-14 w-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          Detailed Analysis
        </h3>
        <p class="text-gray-600 dark:text-gray-300">
          Analyze discrepancies with pinpoint accuracy. Navigate through mismatches and understand the exact differences in your data.
        </p>
      </div>
    </div>

    <!-- Feature List -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden mb-16">
      <div class="p-8 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Complete Feature List
        </h2>
        <p class="text-gray-600 dark:text-gray-300">
          Everything you need for powerful data reconciliation
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-2">
        <!-- Feature 1 -->
        <div class="p-6 border-b md:border-r border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Multi-format Support
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                CSV, Excel, JSON, and more formats supported out of the box.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 2 -->
        <div class="p-6 border-b md:border-r border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Smart Column Mapping
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                Automatic suggestions for column mapping based on headers and content.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 3 -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                High-Speed Processing
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                Parallel processing for lightning-fast reconciliation of even large datasets.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 4 -->
        <div class="p-6 border-b md:border-r border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Interactive Failure Analysis
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                Navigate through discrepancies with our interactive viewer and highlighting.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 5 -->
        <div class="p-6 border-b md:border-r border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Detailed Reporting
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                Generate comprehensive reports with matching statistics and detailed discrepancies.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 6 -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Result Export Options
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                Export reconciliation results as CSV, Excel, or PDF for further analysis.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 7 -->
        <div class="p-6 border-b md:border-r border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Real-time Progress Tracking
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                Monitor reconciliation progress with detailed logs and status updates.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 8 -->
        <div class="p-6 border-b md:border-r border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Dark Mode Support
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                Eye-friendly dark mode for comfortable use in any lighting condition.
              </p>
            </div>
          </div>
        </div>

        <!-- Feature 9 -->
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-start">
            <div class="flex-shrink-0 h-8 w-8 text-blue-600 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Privacy-First Design
              </h3>
              <p class="mt-1 text-gray-600 dark:text-gray-300">
                All data processing happens locally in your browser, ensuring maximum privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="text-center">
      <h2 class="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Ready to transform your data reconciliation workflow?
      </h2>
      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <button 
          on:click={() => goto('/upload')}
          class="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition duration-300"
        >
          Start Reconciling Now
        </button>
        <button 
          on:click={() => goto('/pricing')}
          class="px-8 py-3 rounded-lg bg-white hover:bg-gray-100 text-blue-600 font-semibold border border-blue-600 transition duration-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-blue-400 dark:border-blue-400"
        >
          View Pricing
        </button>
      </div>
    </div>
  </div>
</div>