'use client';
import React, { useEffect, useState } from 'react';
import { getToken, isTokenExpired } from '@/utils/token';
import { profileService } from '@/services/api';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider, type Provider } from '@reown/appkit/react';
import toast from 'react-hot-toast';
import useTokenBalances from '@/hooks/useBalance';
import { ethers } from 'ethers';
import abi from '@/services/abi.json';
import orgAbi from '@/services/organization_abi.json';
import { batchDisburseSalaryAtomic, disburseSalaryAtomic } from '@/services/payRoll';

// Update the Employee interface to match backend status types
interface Employee {
  id: number;
  name: string;
  avatar: string;
  date: string;
  salary: string;
  status: 'Completed' | 'Pending' | 'Failed';  // Match backend status options
}

interface Recipient {
  id: number;
  name: string;
  status: string;
  salary?: number;
  wallet_address?: string;
  position?: string;
}

interface RecipientProfiles {
  recipients: Recipient[];
}

// Add CSS transitions
const transitionClasses = {
  card: "transition-all duration-300 ease-in-out hover:border-blue-500/20",
  button: "transition-all duration-300 ease-in-out hover:bg-blue-700",
  input: "transition-all duration-200 ease-in-out focus:border-blue-500/50",
};

export const PayrollContent = () => {
  const [activeTab, setActiveTab] = useState('payment');
  const [selectedGroup, setSelectedGroup] = useState('active');
  const [paymentMonth, setPaymentMonth] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { walletProvider } = useAppKitProvider<Provider>('eip155');
  const { balances, getTokenBalances } = useTokenBalances();
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [, setPendingPayments] = useState(0);
  const [isDisbursing, setIsDisbursing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isConnected || !address) return;

      setLoading(true);
      try {
        const token = getToken();
        if (!token || isTokenExpired()) return;

        await getTokenBalances(address, walletProvider);

        // const recipientProfiles: RecipientProfiles = await profileService.getOrganizationRecipients(token);
        const orgProfile = await profileService.listOrganizationProfiles(token);
        const recipientProfiles: RecipientProfiles = orgProfile[0];

        // Check if recipientProfiles and recipientProfiles.recipients exist before accessing properties
        if (recipientProfiles && recipientProfiles.recipients) {
          setTotalEmployees(recipientProfiles.recipients.length);
          const activeCount = recipientProfiles.recipients.filter((e: Recipient) => e.status === 'active').length;
          setActiveEmployees(activeCount);
          setPendingPayments(Math.floor(activeCount * 0.3));

          // Update the mockPayrollData mapping
          const mockPayrollData = recipientProfiles.recipients.slice(0, 5).map((recipient: Recipient) => {
            let status: 'Completed' | 'Pending' | 'Failed';
            if (recipient.status === 'completed') {
              status = 'Completed';
            } else if (recipient.status === 'failed') {
              status = 'Failed';
            } else {
              status = 'Pending';
            }

            return {
              id: recipient.id,
              name: recipient.name || 'Unknown',
              avatar: '',
              date: new Date().toLocaleString('default', { month: 'long' }),
              salary: `$${recipient.salary || '0'}(USDT)`,
              status
            };
          });

          setEmployees(mockPayrollData);
        } else {
          // Handle the case when recipients is undefined
          console.warn('No recipients data found');
          setTotalEmployees(0);
          setActiveEmployees(0);
          setPendingPayments(0);
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching payroll data:', error);
        toast.error('Failed to load payroll data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConnected, address, walletProvider, chainId, getTokenBalances]);

  // Update the renderStatus function to handle all possible states
  const renderStatus = (status: string) => {
    switch (status) {
      case 'Completed':
        return <span className="text-green-500">{status}</span>;
      case 'Failed':
        return <span className="text-red-500">{status}</span>;
      case 'Pending':
        return <span className="text-yellow-500">{status}</span>;
      default:
        return <span className="text-gray-400">{status}</span>;
    }
  };

  const handleDisburse = async () => {
    try {
      if (!isConnected || !address || !walletProvider) {
        toast.error('Please connect your wallet first');
        return;
      }

      if (!paymentMonth) {
        toast.error('Please specify payment month');
        return;
      }

      const token = getToken();
      if (!token || isTokenExpired()) {
        toast.error('Authentication required');
        return;
      }

      setIsDisbursing(true);

      // Get organization profile to get the ID
      const orgProfile = await profileService.listOrganizationProfiles(token);
      const organizationId = orgProfile[0]?.id; // Get the organization ID

      if (!organizationId) {
        throw new Error('Organization ID not found');
      }

      const recipientProfiles = orgProfile[0]?.recipients || [];
      const filteredRecipients = selectedGroup === 'all'
        ? recipientProfiles
        : recipientProfiles.filter(r => r.status === selectedGroup);

      if (filteredRecipients.length === 0) {
        toast.error('No recipients found for selected group');
        return;
      }

      const provider = new ethers.BrowserProvider(walletProvider, chainId);
      const signer = await provider.getSigner();

      const factoryContractAddress = process.env.NEXT_PUBLIC_LISK_CONTRACT_ADDRESS;
      if (!factoryContractAddress) {
        throw new Error('Factory contract address not configured');
      }

      const factoryContract = new ethers.Contract(factoryContractAddress, abi, provider);
      const contractAddress = await factoryContract.getOrganizationContract(address);

      const payrollContract = new ethers.Contract(contractAddress, orgAbi, signer);

      const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS;
      if (!usdtAddress) {
        throw new Error('USDT token address not found');
      }

      const usdtContract = new ethers.Contract(
        usdtAddress,
        ['function allowance(address,address) view returns (uint256)',
          'function approve(address,uint256) returns (bool)',
          'function balanceOf(address) view returns (uint256)'],
        signer
      );

      // Calculate total net amount
      const totalNetAmount = filteredRecipients.reduce((sum, r) => sum + (r.salary || 0), 0);

      // Use contract's calculateGrossAmount function
      const totalGrossAmount = await payrollContract.calculateGrossAmount(
        ethers.parseUnits(totalNetAmount.toString(), 6)
      );

      // Check current allowance
      const currentAllowance = await usdtContract.allowance(address, contractAddress);

      if (currentAllowance < totalGrossAmount) {
        toast.loading('Approving USDT...');
        const approveTx = await usdtContract.approve(
          contractAddress,
          totalGrossAmount // Using gross amount from contract
        );
        await approveTx.wait();
        toast.dismiss();
        toast.success('USDT approved');
      }

      // Check balance
      const balance = await usdtContract.balanceOf(address);
      if (balance < totalGrossAmount) {
        throw new Error(
          `Insufficient USDT balance. Required: ${ethers.formatUnits(totalGrossAmount, 6)} USDT`
        );
      }

      if (filteredRecipients.length === 1) {
        const recipient = filteredRecipients[0];
        await disburseSalaryAtomic({
          recipientId: recipient.id,
          recipientAddress: recipient.recipient_ethereum_address,
          amount: recipient.salary,
          tokenAddress: usdtAddress,
          paymentMonth,
          token,
          signer,
          contractAddress,
          organizationId,
        });
      } else {
        await batchDisburseSalaryAtomic({
          recipients: filteredRecipients.map(r => ({
            id: r.id,
            address: r.recipient_ethereum_address,
            amount: r.salary,
          })),
          tokenAddress: usdtAddress,
          paymentMonth,
          token,
          signer,
          contractAddress,
          organizationId,
        });
      }

      // Refresh data after successful disbursement
      const updatedOrgProfile = await profileService.listOrganizationProfiles(token);
      const updatedRecipients = updatedOrgProfile[0]?.recipients || [];

      setTotalEmployees(updatedRecipients.length);
      setActiveEmployees(updatedRecipients.filter(r => r.status === 'active').length);

      toast.success('Salary disbursement completed successfully!');
    } catch (error) {
      console.error('Disbursement error:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown disbursement error');
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleDisbursement = async () => {
    if (!isConnected || !address || !walletProvider) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsDisbursing(true);
    const loadingToast = toast.loading('Processing disbursement...');

    try {
      await handleDisburse();
      toast.success('Disbursement completed successfully!', {
        id: loadingToast,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unknown error', {
        id: loadingToast,
      });
    } finally {
      setIsDisbursing(false);
    }
  };

  const calculateTotalAmount = () => {
    if (selectedGroup === 'all') {
      return employees.reduce((sum, emp) => sum + parseFloat(emp.salary.replace('$', '').split('(')[0]), 0);
    } else if (selectedGroup === 'active') {
      return employees.filter(emp => emp.status !== 'Pending').reduce((sum, emp) => sum + parseFloat(emp.salary.replace('$', '').split('(')[0]), 0);
    } else {
      return employees.filter(emp => emp.status === 'Pending').reduce((sum, emp) => sum + parseFloat(emp.salary.replace('$', '').split('(')[0]), 0);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
        {/* Treasury Card */}
        <div className={`col-span-full md:col-span-3 bg-black rounded-lg p-6 border border-[#2C2C2C] ${transitionClasses.card}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="bg-white/10 p-3 rounded-full transform transition-transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="blue" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <p className="text-gray-400 text-sm">Treasury wallet balance</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl md:text-4xl font-semibold text-white">
                {balances.loading ? (
                  <div className="animate-pulse bg-gray-700 h-8 w-32 rounded" />
                ) : (
                  `$${balances.USDT || '0'}`
                )}
              </h2>
              <p className="text-gray-400 text-sm">(USDT)</p>
            </div>
          </div>
        </div>

        {/* Active Employees Card */}
        <div className={`col-span-full md:col-span-1 bg-black rounded-lg p-6 border border-[#2C2C2C] ${transitionClasses.card}`}>
          <div className="relative w-24 h-24 mx-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <circle cx="60" cy="60" r="54" fill="none" stroke="white" strokeWidth="6" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeDasharray="339.3"
                strokeDashoffset={totalEmployees > 0 ? 339.3 * (1 - (activeEmployees / totalEmployees)) : 339.3}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white text-xl font-bold">
                {totalEmployees > 0 ? `${Math.round((activeEmployees / totalEmployees) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
          <div className="mt-4 whitespace-nowrap">
            <h2 className="text-white text-3xl font-semibold text-center">{activeEmployees}</h2>
            <p className="text-gray-500 text-sm text-center">Active employee</p>
          </div>
        </div>

        

        {/* Payment Section */}
        <div className={`col-span-full bg-black rounded-lg p-6 border border-[#2C2C2C] ${transitionClasses.card}`}>
          {/* Tabs */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-lg ${activeTab === 'payment'
                ? 'text-blue-500 border border-blue-500/30'
                : 'text-gray-400'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Payment
            </button>
            <button
              onClick={() => setActiveTab('salary')}
              className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-lg ${activeTab === 'salary'
                ? 'bg-blue-600/10 text-blue-500 border border-blue-500/30'
                : 'text-gray-400'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Salary Batch
            </button>
          </div>

          {/* Form Content */}
          <div className="space-y-8">
            {/* Groups Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-gray-400 mb-4">Select Groups For Payment</h3>
                <div className="flex space-x-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="employeeGroup"
                      value="all"
                      checked={selectedGroup === 'all'}
                      onChange={() => setSelectedGroup('all')}
                      className="form-radio h-4 w-4 text-blue-500 hidden"
                    />
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full border ${selectedGroup === 'all' ? 'border-blue-500 bg-blue-500' : 'border-[#0072E5]'
                      }`}>
                      {selectedGroup === 'all' && (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      )}
                    </span>
                    <span className="ml-2 text-white">All Employees</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="employeeGroup"
                      value="active"
                      checked={selectedGroup === 'active'}
                      onChange={() => setSelectedGroup('active')}
                      className="form-radio h-4 w-4 text-blue-500 hidden"
                    />
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full border ${selectedGroup === 'active' ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                      }`}>
                      {selectedGroup === 'active' && (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      )}
                    </span>
                    <span className="ml-2 text-white">Active</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="employeeGroup"
                      value="onLeave"
                      checked={selectedGroup === 'onLeave'}
                      onChange={() => setSelectedGroup('onLeave')}
                      className="form-radio h-4 w-4 text-blue-500 hidden"
                    />
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full border ${selectedGroup === 'onLeave' ? 'border-blue-500 bg-blue-500' : 'border-[#0072E5]'
                      }`}>
                      {selectedGroup === 'onLeave' && (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      )}
                    </span>
                    <span className="ml-2 text-white">On Leave</span>
                  </label>
                </div>
              </div>

              {/* Total Amount Section */}
              <div className="items-center">
                <div className="text-gray-400 text-sm">Total amount to be disbursed</div>
                <div className="flex items-center text-white font-medium">
                  <div className="bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-3xl">${calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`border border-gray-800 rounded-lg p-4 ${transitionClasses.card}`}>
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-teal-500 rounded-md mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-white">USDT</div>
                    <div className="text-gray-500 text-sm">Select Currency</div>
                  </div>
                </div>
              </div>

              <div className={`border border-gray-800 rounded-lg p-4 ${transitionClasses.card}`}>
                <div className="text-white">Payment Month</div>
                <input
                  type="text"
                  placeholder="E.g. April 2025"
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                  className={`bg-transparent text-gray-400 text-sm w-full mt-1 focus:outline-none ${transitionClasses.input}`}
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              <button
                onClick={handleDisbursement}
                disabled={isDisbursing}
                className={`
                  bg-blue-600 text-white px-8 py-3 rounded-lg 
                  font-medium flex items-center gap-2
                  ${transitionClasses.button}
                  ${isDisbursing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}
                `}
              >
                {isDisbursing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Disburse
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollContent;