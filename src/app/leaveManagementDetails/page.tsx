'use client';

import React from 'react';
import Layout from '@/components/Sidebar';
import LeaveManagement from '@/components/dashboard/LeaveManagement';
import LeaveManagementDetails from '@/components/dashboard/LeaveManagementDetails';

function Employees() {
  return (
    <Layout>
     <LeaveManagementDetails/>
    </Layout>
  );
}

export default Employees;
