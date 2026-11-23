import Layout from "../../components/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome to the Energy Pathways Admin dashboard.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;