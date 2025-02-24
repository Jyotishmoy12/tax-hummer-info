import { useState } from "react";
import { BarChart, Bar, YAxis, ResponsiveContainer, Cell } from "recharts";
import { Info } from "lucide-react";

/**
 * Formats a numeric string into the Indian number format.
 * If input is empty, returns an empty string.
 */
const formatIndianNumber = (numStr) => {
  if (!numStr) return "";
  // Remove any commas
  const numericValue = numStr.replace(/,/g, "");
  // Format using the en-IN locale
  return new Intl.NumberFormat("en-IN").format(Number(numericValue));
};

/**
 * A simple tooltip component that shows explanatory text on hover/touch.
 */
const InfoTooltip = ({ content }) => {
  const [isTooltipVisible, setTooltipVisible] = useState(false);

  const handleTouchStart = () => setTooltipVisible(true);
  const handleTouchEnd = () => setTooltipVisible(false);
  const handleMouseEnter = () => setTooltipVisible(true);
  const handleMouseLeave = () => setTooltipVisible(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
      {isTooltipVisible && (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-64 opacity-100 transition-opacity">
          <div className="flex items-center justify-center">
            <div className="bg-black text-white text-sm rounded-lg py-2 px-3">
              {content}
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full">
            <div className="w-2 h-2 bg-black rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Helper to return tooltip text for each field.
 */
const getTooltipContent = (field) => {
  const tooltips = {
    salary: "Annual salary (CTC). Old Regime can subtract HRA/LTA here.",
    exemptAllowances: "Exempt allowances like HRA, LTA, etc. (Old Regime).",
    interestIncome: "Interest from savings, FDs, etc.",
    homeLoanSelfOccupied: "Interest on home loan (self-occupied).",
    rentalIncome: "Income from rented property.",
    homeLoanLetOut: "Interest on home loan (let-out property).",
    digitalAssets: "Income from virtual digital assets.",
    otherIncome: "Any other taxable income.",
    basic80C: "Investments under Section 80C (PPF, ELSS, etc.).",
    deposits80TTA: "Interest earned from savings account (80TTA).",
    medical80D: "Medical insurance premium (80D).",
    donations80G: "Donations to approved charities (80G).",
    housing80EEA: "Additional home-loan interest deduction (80EEA).",
    nps80CCD: "Contributions to NPS (80CCD(1)).",
    nps80CCD2: "Employer's contribution to NPS (80CCD(2)).",
    otherDeduction: "Other Chapter VI-A deductions.",
  };
  return tooltips[field] || "Enter details here";
};

const TaxCalculator = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showDashboard, setShowDashboard] = useState(false);
  const [formData, setFormData] = useState({
    financialYear: "FY 2025-2026", // or "FY 2024-2025"
    ageGroup: "0-60",
    incomeDetails: {
      salary: "", // Stored as a string without commas
      exemptAllowances: "",
      interestIncome: "",
      homeLoanSelfOccupied: "",
      rentalIncome: "",
      homeLoanLetOut: "",
      digitalAssets: "",
      otherIncome: "",
    },
    deductions: {
      basic80C: "",
      deposits80TTA: "",
      medical80D: "",
      donations80G: "",
      housing80EEA: "",
      nps80CCD: "",
      nps80CCD2: "",
      otherDeduction: "",
    },
  });

  // Results to display after calculation
  const [taxResults, setTaxResults] = useState({
    totalIncome: 0,
    exemptAllowances: 0,
    standardDeduction: 0,
    chapterVIA: 0,
    taxableIncome: 0,
    taxPayable: 0,
    incomeTax: 0,
    surcharge: 0,
    healthEducationCess: 0,
  });

  const [selectedRegime, setSelectedRegime] = useState("new");

  /**
   * 1. Calculate "gross income."
   *    - Old Regime: subtract "exemptAllowances" from "salary"
   *    - New Regime: do not subtract "exemptAllowances"
   */
  const calculateTotalIncome = () => {
    const inc = formData.incomeDetails;
    let salary = Number(inc.salary) || 0;
    const exempt = Number(inc.exemptAllowances) || 0;
    let otherIncome =
      (Number(inc.interestIncome) || 0) +
      (Number(inc.homeLoanSelfOccupied) || 0) +
      (Number(inc.rentalIncome) || 0) +
      (Number(inc.homeLoanLetOut) || 0) +
      (Number(inc.digitalAssets) || 0) +
      (Number(inc.otherIncome) || 0);

    if (selectedRegime === "old") {
      salary -= exempt;
    }
    return salary + otherIncome;
  };

  /**
   * 2. Calculate the total deduction.
   *    - New Regime: standard deduction only.
   *    - Old Regime: standard deduction + Chapter VI-A deductions.
   */
  const calculateDeductions = () => {
    const fy = formData.financialYear;
    let standardDeduction = fy === "FY 2025-2026" ? 75000 : 50000;

    if (selectedRegime === "new") {
      return standardDeduction;
    } else {
      const chapterVIA = Object.values(formData.deductions).reduce(
        (a, b) => a + (Number(b) || 0),
        0
      );
      return standardDeduction + chapterVIA;
    }
  };

  /**
   * 3. Slab-wise tax calculation based on regime & FY, including rebate and cess.
   */
  const calculateTaxSlabWise = (taxableIncome) => {
    let tax = 0;
    const fy = formData.financialYear;

    if (selectedRegime === "new") {
      const isFY2526 = fy === "FY 2025-2026";
      if (taxableIncome > 1500000) {
        tax =
          slabTax(0, 300000, 0) +
          slabTax(300000, 600000, 0.05) +
          slabTax(600000, 900000, 0.1) +
          slabTax(900000, 1200000, 0.15) +
          slabTax(1200000, 1500000, 0.2) +
          (taxableIncome - 1500000) * (isFY2526 ? 0.25 : 0.3);
      } else if (taxableIncome > 1200000) {
        tax =
          slabTax(0, 300000, 0) +
          slabTax(300000, 600000, 0.05) +
          slabTax(600000, 900000, 0.1) +
          (taxableIncome - 1200000) * 0.2;
      } else if (taxableIncome > 900000) {
        tax =
          slabTax(0, 300000, 0) +
          slabTax(300000, 600000, 0.05) +
          (taxableIncome - 900000) * 0.15;
      } else if (taxableIncome > 600000) {
        tax =
          slabTax(0, 300000, 0) +
          (taxableIncome - 600000) * 0.1;
      } else if (taxableIncome > 300000) {
        tax = (taxableIncome - 300000) * 0.05;
      } else {
        tax = 0;
      }

      // Apply 87A Rebate for New Regime:
      if (fy === "FY 2024-2025" && taxableIncome <= 700000) {
        tax = 0;
      } else if (fy === "FY 2025-2026" && taxableIncome <= 1200000) {
        tax = 0;
      }
    } else {
      // Old Regime Slabs:
      if (taxableIncome > 1000000) {
        tax = 12500 + 100000 + (taxableIncome - 1000000) * 0.3;
      } else if (taxableIncome > 500000) {
        tax = 12500 + (taxableIncome - 500000) * 0.2;
      } else if (taxableIncome > 250000) {
        tax = (taxableIncome - 250000) * 0.05;
      } else {
        tax = 0;
      }
      if (taxableIncome <= 500000) {
        tax = 0;
      }
    }

    const cess = Math.round(tax * 0.04);
    return {
      tax,
      cess,
      finalTax: tax + cess,
    };
  };

  /**
   * Utility function to calculate tax for a slab.
   */
  const slabTax = (lower, upper, rate) => {
    return (upper - lower) * rate;
  };

  /**
   * Handle the "Calculate" button click.
   */
  const handleCalculate = () => {
    const totalIncome = calculateTotalIncome();
    const totalDeductions = calculateDeductions();
    const taxableIncome = Math.max(0, totalIncome - totalDeductions);

    const { tax, cess, finalTax } = calculateTaxSlabWise(taxableIncome);

    setTaxResults({
      totalIncome,
      exemptAllowances:
        selectedRegime === "new"
          ? Number(formData.incomeDetails.exemptAllowances) || 0
          : 0,
      standardDeduction: formData.financialYear === "FY 2025-2026" ? 75000 : 50000,
      chapterVIA:
        selectedRegime === "old"
          ? Object.values(formData.deductions).reduce(
              (a, b) => a + (Number(b) || 0),
              0
            )
          : 0,
      taxableIncome,
      incomeTax: tax,
      healthEducationCess: cess,
      surcharge: 0,
      taxPayable: finalTax,
    });

    setShowDashboard(true);
  };

  /**
   * Updated input change handler to remove commas and store a sanitized value.
   */
  const handleInputChange = (category, field, value) => {
    const sanitizedValue = value.replace(/,/g, "");
    setFormData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: sanitizedValue,
      },
    }));
  };

  const tabs = ["Basic Details", "Income Details", "Deductions"];

  const formatDeductionLabel = (key) => {
    switch (key) {
      case "basic80C":
        return "Basic - 80C";
      case "deposits80TTA":
        return "Deposits - 80TTA";
      case "medical80D":
        return "Medical - 80D";
      case "donations80G":
        return "Donations - 80G";
      case "housing80EEA":
        return "Housing - 80EEA";
      case "nps80CCD":
        return "NPS - 80CCD";
      case "nps80CCD2":
        return "NPS - 80CCD(2)";
      case "otherDeduction":
        return "Other Deduction";
      default:
        return key;
    }
  };

  const formatIncomeDetailsLabel = (key) => {
    switch (key) {
      case "salary":
        return "Income from Salary";
      case "exemptAllowances":
        return "Exempt Allowances";
      case "interestIncome":
        return "Income from Interest";
      case "homeLoanSelfOccupied":
        return "Interest on Home Loan (Self-Occupied)";
      case "rentalIncome":
        return "Rental Income";
      case "homeLoanLetOut":
        return "Interest on Home Loan (Let-Out)";
      case "digitalAssets":
        return "Income from Digital Assets";
      case "otherIncome":
        return "Other Income";
      default:
        return key;
    }
  };

  /**
   * Render tab contents.
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="space-y-6">
            <label className="block">
              <span className="text-lg font-semibold text-gray-800">
                Financial Year
              </span>
              <select
                className="mt-2 block w-full h-12 rounded-lg border border-gray-300 bg-white px-4 text-gray-700 shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-300 transition-all"
                value={formData.financialYear}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    financialYear: e.target.value,
                  }))
                }
              >
                <option>FY 2025-2026</option>
                <option>FY 2024-2025</option>
              </select>
            </label>

            <label className="block">
              <span className="text-lg font-semibold text-gray-800">
                Age Group
              </span>
              <select
                className="mt-2 block w-full h-12 rounded-lg border border-gray-300 bg-white px-4 text-gray-700 shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-300 transition-all"
                value={formData.ageGroup}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ageGroup: e.target.value,
                  }))
                }
              >
                <option>0-60</option>
                <option>60-80</option>
                <option>80+</option>
              </select>
            </label>
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(formData.incomeDetails).map(([key, value], idx) => (
              <label key={idx} className="block">
                <span className="text-gray-700 flex items-center gap-2">
                  {formatIncomeDetailsLabel(key)}
                  <InfoTooltip content={getTooltipContent(key)} />
                </span>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center w-8 pointer-events-none text-white font-bold bg-purple-600 rounded-lg">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={formatIndianNumber(formData.incomeDetails[key])}
                    onChange={(e) =>
                      handleInputChange("incomeDetails", key, e.target.value)
                    }
                    placeholder="e.g., 12,75,000"
                    className="pl-12 block w-full h-12 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring focus:ring-purple-200"
                  />
                </div>
              </label>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(formData.deductions).map(([key, value], idx) => (
              <label key={idx} className="block">
                <span className="text-gray-700 flex items-center gap-2">
                  {formatDeductionLabel(key)}
                  <InfoTooltip content={getTooltipContent(key)} />
                </span>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center w-8 pointer-events-none text-white font-bold bg-purple-600 rounded-lg">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={formatIndianNumber(formData.deductions[key])}
                    onChange={(e) =>
                      handleInputChange("deductions", key, e.target.value)
                    }
                    placeholder="e.g., 1,50,000"
                    className="pl-12 block w-full h-12 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring focus:ring-purple-200"
                  />
                </div>
              </label>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  /**
   * Prepare data for the bar chart.
   */
  const chartData = [
    { name: "Total Income", value: taxResults.totalIncome },
    {
      name: "Deduction",
      value: taxResults.standardDeduction + taxResults.chapterVIA,
    },
    { name: "Taxable Income", value: taxResults.taxableIncome },
    { name: "Tax Payable", value: taxResults.taxPayable },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 my-25">
      {/* Regime Selection */}
      <div className="border-b pb-2">
        <div className="flex space-x-4">
          <button
            className={`px-6 py-2 text-lg font-medium transition-colors duration-300 ease-in-out transform rounded-xl ${
              selectedRegime === "new"
                ? "bg-purple-600 text-white border-b-1 border-purple-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setSelectedRegime("new")}
          >
            New regime
            {selectedRegime === "new" && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-xs">
                Recommended
              </span>
            )}
          </button>

          <button
            className={`px-6 py-2 text-lg font-medium transition-colors duration-300 ease-in-out transform rounded-2xl ${
              selectedRegime === "old"
                ? "bg-purple-600 text-white border-b-2 border-purple-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setSelectedRegime("old")}
          >
            Old regime
          </button>
        </div>
      </div>

      {/* Calculator Form */}
      <div className="bg-white rounded-4xl shadow-md">
        <div className="flex space-x-4 border-b px-6 pt-6">
          {tabs.map((tab, index) => (
            <button
              key={index}
              className={`px-4 py-2 text-sm font-medium border-b-2 focus:outline-none transition-colors ${
                activeTab === index
                  ? "bg-purple-600 text-white border-b-2 border-purple-60 rounded-3xl"
                  : "border-transparent text-gray-600"
              }`}
              onClick={() => setActiveTab(index)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">{renderTabContent()}</div>

        <div className="flex flex-col sm:flex-row justify-between p-4 sm:p-6 border-t gap-2 sm:gap-0">
          {activeTab > 0 && (
            <button
              className="w-full sm:w-auto px-6 sm:px-12 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              onClick={() => setActiveTab((prev) => prev - 1)}
            >
              Back
            </button>
          )}
          {activeTab < tabs.length - 1 ? (
            <button
              className="w-full sm:w-auto px-6 sm:px-12 py-2.5 bg-purple-500 text-white rounded-md hover:bg-purple-700 transition-colors"
              onClick={() => setActiveTab((prev) => prev + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              className="w-full sm:w-auto px-6 sm:px-14 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              onClick={handleCalculate}
            >
              Calculate
            </button>
          )}
        </div>
      </div>

      {/* Results Dashboard */}
      {showDashboard && (
        <div className="space-y-6">
          {/* Income Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-600">Total Income</h3>
              <p className="text-3xl font-bold mt-2">
                ₹{taxResults.totalIncome.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-600">Taxable Income</h3>
              <p className="text-3xl font-bold mt-2">
                ₹{taxResults.taxableIncome.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Chart and Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Tax Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 65, bottom: 5 }}
                  >
                    <YAxis
                      tickFormatter={(value) =>
                        `₹${(value / 1000).toFixed(0)}K`
                      }
                      tick={{ fontSize: 12 }}
                    />
                    <Bar dataKey="value" barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? "#60A5FA"
                              : index === 1
                              ? "#F59E0B"
                              : index === 2
                              ? "#10B981"
                              : "#6366F1"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-400 rounded mr-2"></div>
                  <span className="text-sm">Total Income</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
                  <span className="text-sm">Deductions</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-emerald-500 rounded mr-2"></div>
                  <span className="text-sm">Taxable Income</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-indigo-500 rounded mr-2"></div>
                  <span className="text-sm">Tax Payable</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="md:col-span-2 bg-gray-50 p-6 rounded-lg">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Exemption and Deduction
                  </h3>
                  <p className="text-3xl font-bold">
                    ₹
                    {(taxResults.standardDeduction + taxResults.chapterVIA).toLocaleString("en-IN")}
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Exempt Allowances</span>
                      <span>₹{taxResults.exemptAllowances.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Standard Deduction</span>
                      <span>₹{taxResults.standardDeduction.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Chapter VI-A</span>
                      <span>₹{taxResults.chapterVIA.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Tax Payable</h3>
                  <p className="text-3xl font-bold">
                    ₹{taxResults.taxPayable.toLocaleString("en-IN")}
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Income Tax</span>
                      <span>₹{taxResults.incomeTax.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Surcharge</span>
                      <span>₹{taxResults.surcharge.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Health &amp; Education Cess</span>
                      <span>₹{taxResults.healthEducationCess.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCalculator;
