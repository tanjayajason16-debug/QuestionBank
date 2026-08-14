// Root page: redirect to student landing
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/tryout')
}
