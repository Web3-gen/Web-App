import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LeaveManagementDetails() {
  const [isApproved, setIsApproved] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);

  const handleApprove = () => {
    setIsApproved(true);
  };

  const handleDecline = () => {
    setIsDeclined(true);
  };

  return (
    <div className="bg-black text-white p-8">
      <div className="">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-6">
          <div className="flex items-center">
            <Link href="/employees" className="mr-4">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-xl font-medium">Recipient Leave</h1>
          </div>
          <div className="text-gray-400 text-sm">
            <span>Date Submitted</span>
            <span className="ml-4">May 12, 2025</span>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="mb-8">
          <div className=" ">
            <div className="relative w-16 h-16 rounded-full overflow-hidden mr-4">
              <div className="absolute inset-0 bg-gray-600 rounded-full">
                {/* Profile image placeholder */}
                <div className="w-full h-full relative flex items-center justify-center bg-blue-600 text-white text-2xl font-bold">
                  JS
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center mt-4">
                <h2 className="text-2xl font-medium mr-3">John Smith</h2>
                <span className="text-green-500 text-sm -mb-2">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="border-t border-gray-800 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-1">Position</p>
                <p>Software Engineer</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Leave Balance</p>
                <div className="flex items-center">
                  <p>3 Days Remaining</p>
                  <div className="ml-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <p className="text-gray-400 text-sm mb-1">Total Days</p>
                <p>3 Working Days</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Date Range</p>
                <p>May 22 - May 25, 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reason Section */}
        <div className="border-t border-gray-800 pb-4 pt-8 mb-8">
          <p className="text-gray-400 text-sm mb-2">Reason for Leave</p>
          <p className="italic text-gray-300">
            I have a scheduled medical appointment that requires my full attention, followed by a short recovery period as advised by my physician. Due to this, I will not be able to perform my duties effectively during this time. I kindly request medical leave from May 20 to May 22, 2025, to prioritize my health and return to work fully recovered. A medical certificate can be provided upon request to support this leave application. I appreciate your understanding and support.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-20">
          {isDeclined ? (
            <div className="text-red-500">Request declined</div>
          ) : isApproved ? (
            <div className="text-green-500">Request approved</div>
          ) : (
            <>
              <button
                onClick={handleDecline}
                className="px-6 py-2 rounded-md mr-4 border border-gray-700 hover:bg-gray-800"
              >
                Decline
              </button>
              <button
                onClick={handleApprove}
                className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}