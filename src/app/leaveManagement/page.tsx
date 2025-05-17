'use client';

import React from 'react';
import Layout from '@/components/Sidebar';
import LeaveManagement from '@/components/dashboard/LeaveManagement';

function Employees() {
  return (
    <Layout>
     <LeaveManagement/>
    </Layout>
  );
}

export default Employees;
