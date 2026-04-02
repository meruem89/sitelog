import LogEntryForm from '@/components/LogEntryForm'

export default function LogsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Logs</h1>
        <p className="text-gray-600">Manage your site logs and expenses</p>
      </div>

      <LogEntryForm />
    </div>
  )
}
