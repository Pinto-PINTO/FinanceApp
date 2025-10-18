{currentScreen === "home" && (
    <div className="space-y-6">
      {/* Month Navigator - ADD THIS ENTIRE SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Previous Month"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          
          <div className="text-center flex-1">
            <h2 className="text-3xl font-bold text-gray-900">
              {getMonthDisplay()}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {getMonthTransactions().length} transactions this month
            </p>
          </div>
          
          <button
            onClick={handleNextMonth}
            disabled={isCurrentMonth()}
            className={`p-2 rounded-lg transition-colors ${
              isCurrentMonth()
                ? "text-gray-300 cursor-not-allowed"
                : "hover:bg-gray-100 text-gray-600"
            }`}
            title="Next Month"
          >
            <ChevronLeft size={24} className="rotate-180" />
          </button>
        </div>
        
        {!isCurrentMonth() && (
          <div className="mt-4 text-center">
            <button
              onClick={handleCurrentMonth}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Back to Current Month
            </button>
          </div>
        )}
      </div>
  
      {/* Layout Selector Button - EXISTING CODE STAYS HERE */}
      <div className="flex justify-end">