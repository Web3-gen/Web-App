'use client';
import { getToken, isTokenExpired, removeToken, storeToken } from '@/utils/token';
import { profileService, web3AuthService } from '@/services/api';
import { useAppKitAccount, useAppKitNetwork, useAppKitProvider, type Provider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import React, { useEffect, useState, useCallback } from 'react';
import abi from "@/services/abi.json";
import toast from 'react-hot-toast';
import useTokenBalances from '@/hooks/useBalance';
import { toastConfig } from '@/utils/toast';
import CreateRecipient from '../CreateRecipient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// API response type
interface RecipientProfile {
  id: number;
  name: string;
  email: string;
  recipient_ethereum_address: string;
  organization: number;
  phone_number: string;
  salary: number;
  position: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Recipient {
  id: number;
  name: string;
  position: string;
  wallet: string;
  salary: string;
  status: string;
}

export const EmployeesContent = () => {
  const [loading, setLoading] = useState(true);
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { walletProvider } = useAppKitProvider<Provider>('eip155');
  const [employees, setEmployees] = useState<Recipient[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const { balances, getTokenBalances } = useTokenBalances();
  const balance = balances.loading ? '...' : balances.USDT || balances.USDC || '0';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!isConnected || !address) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(walletProvider, chainId);
      const signer = await provider.getSigner();

      const token = getToken();
      if (!token || isTokenExpired()) {
        // Get new token
        const { nonce } = await web3AuthService.getNonce(address);
        const message = `I'm signing my one-time nonce: ${nonce}`;
        const signature = await signer.signMessage(message);

        const authResponse = await web3AuthService.login({
          address,
          signature
        });

        storeToken(authResponse.access); // Default to 1 hour if not provided
      }

      if (balances.USDT === '0' && balances.USDC === '0' && !balances.loading) {
        await getTokenBalances(address, walletProvider);
      }

      const orgProfile = await profileService.listOrganizationProfiles(token);
      const recipientProfiles = orgProfile[0];

      // Handle the case where recipients might be undefined or not an array
      const recipients: RecipientProfile[] = recipientProfiles.recipients || [];

      const transformedEmployees = Array.isArray(recipients) ? recipients.map((recipient) => ({
        id: recipient.id,
        name: recipient.name || 'Unknown',
        position: recipient.position || 'Not specified',
        wallet: recipient.recipient_ethereum_address ? `${recipient.recipient_ethereum_address.substring(0, 4)}...${recipient.recipient_ethereum_address.substring(recipient.recipient_ethereum_address.length - 3)}` : 'No wallet',
        salary: recipient.salary ? `$${recipient.salary}(USDT)` : '$0(USDT)',
        status: recipient.status || 'inactive'
      })) : [];

      setEmployees(transformedEmployees);
      setTotalEmployees(transformedEmployees.length);
      setActiveEmployees(transformedEmployees.filter(e => e.status === 'active').length);

      const contractAddress = process.env.NEXT_PUBLIC_LISK_CONTRACT_ADDRESS as string;
      const payrollContract = new ethers.Contract(contractAddress, abi, signer);

      const _orgDetails = await payrollContract.getOrganizationDetails(address);
      const _orgContractAddress = await payrollContract.getOrganizationContract(address);

    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error);

      // If the error is due to token expiration, remove the token
      if (error && typeof error === 'object' && 'response' in error &&
        error.response && typeof error.response === 'object' &&
        'status' in error.response && error.response.status === 401) {
        removeToken();
        toast.error('Session expired.');
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      } else {
        toast.error('Failed to load dashboard data\nPlease refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, walletProvider, chainId, balances.USDT, balances.USDC, balances.loading, getTokenBalances]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveEmployee = async (id: number) => {
    // Optimistically update UI
    const employeeToRemove = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setTotalEmployees(prev => prev - 1);

    if (employeeToRemove?.status === 'active') {
      setActiveEmployees(prev => prev - 1);
    }

    const loadingToast = toast.loading('Removing employee...', toastConfig);

    try {
      const token = getToken();
      if (!token || isTokenExpired()) {
        throw new Error('Authentication required');
      }

      await profileService.deleteRecipientProfile(id, token);
      toast.success('Employee removed successfully', {
        ...toastConfig,
        id: loadingToast,
      });
    } catch (error) {
      // Rollback optimistic update
      if (employeeToRemove) {
        setEmployees(prev => [...prev, employeeToRemove]);
        setTotalEmployees(prev => prev + 1);
        if (employeeToRemove.status === 'active') {
          setActiveEmployees(prev => prev + 1);
        }
      }

      console.error('Error removing recipient:', error);

      if (error && typeof error === 'object' && 'response' in error &&
        error.response && typeof error.response === 'object' &&
        'status' in error.response && error.response.status === 401) {
        removeToken();
        toast.error('Session expired. Please refresh the page.', {
          ...toastConfig,
          id: loadingToast,
        });
      } else {
        toast.error('Failed to remove employee', {
          ...toastConfig,
          id: loadingToast,
        });
      }
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchData(); // Re-fetch the employees list
  };

  const getStatusColorClass = (status: string) => {
    return status === 'active'
      ? 'text-green-500'
      : status === 'on leave'
        ? 'text-yellow-500'
        : 'text-gray-500';
  };

  // Calculate stroke dashoffset safely
  const calculateStrokeDashoffset = () => {
    if (totalEmployees <= 0 || activeEmployees <= 0) {
      return "339.3"; // Return default value as string when no data
    }
    const ratio = activeEmployees / totalEmployees;
    const offset = 339.3 * (1 - ratio);
    return offset.toString(); // Convert to string to avoid NaN warning
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
        <div className="col-span-full md:col-span-3 bg-black rounded-lg p-4 md:p-6 border border-[#2C2C2C] transition-all duration-300 hover:border-blue-500/20">
          <div className="flex items-center justify-between mb-8">
            <div className="bg-white/10 p-3 rounded-full transition-transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="blue" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          <div className="mt-8 space-y-2">
            <p className="text-gray-400 text-sm">Treasury wallet balance</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl md:text-4xl font-semibold text-white">
                {balances.loading ? (
                  <div className="animate-pulse bg-gray-700 h-8 w-32 rounded" />
                ) : (
                  `$${balance}`
                )}
              </h2>
              <p className="text-gray-400 text-sm">(USDT)</p>
            </div>
          </div>
        </div>

        {/* Active Employees Card */}
        <div className="col-span-full md:col-span-1 bg-black rounded-lg p-4 md:p-6 border border-[#2C2C2C] transition-all duration-300 hover:border-blue-500/20">
          <div className="relative w-24 h-24">
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
                strokeDashoffset={calculateStrokeDashoffset()}
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

        {/* Pending Payments Card */}
        <div className="col-span-full md:col-span-2 bg-black rounded-lg p-4 md:p-6 border border-[#2C2C2C] transition-all duration-300 hover:border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="blue" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <line x1="16" y1="21" x2="16" y2="3" />
                  <line x1="8" y1="21" x2="8" y2="3" />
                </svg>
              </div>
            </div>
          <Link href="/leaveManagement" >
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>


          </div>
          <div className="mt-16 gap-2 flex items-center">
            <h2 className="text-white text-3xl font-semibold">4</h2>
            <p className="text-gray-500 text-sm">Leave Request</p>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-black rounded-lg border border-[#2C2C2C] overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 gap-4">
          <div className="flex items-center">
            <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="blue" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-medium">Recipients</h2>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />

            </svg>
            Add Recipient
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-left text-gray-500 text-sm">
                <th className="px-20 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Position</th>
                <th className="px-6 py-3 font-medium">Wallet address</th>
                <th className="px-6 py-3 font-medium">Salary</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C2C2C]">
              {employees.length > 0 ? (
                employees.map((employee) => (
                  <tr key={employee.id} className="text-white transition-colors hover:bg-gray-900/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 mr-3 rounded-full overflow-hidden bg-gray-700">
                          <div className="w-full h-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-blue-500">
                              {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        {employee.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{employee.position}</td>
                    <td className="px-6 py-4 text-gray-400">{employee.wallet}</td>
                    <td className="px-6 py-4 text-gray-400">{employee.salary}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColorClass(employee.status)}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveEmployee(employee.id)}
                        className="bg-blue-600 text-white px-6 py-1.5 rounded-lg text-sm font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-gray-800/50 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <p className="text-gray-500">No recipients found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4">
          <div className="relative w-full max-w-4xl animate-fade-in">
            <CreateRecipient
              onClose={() => setShowCreateModal(false)}
              onSuccess={handleCreateSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesContent;