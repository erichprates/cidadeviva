import { redirect } from 'next/navigation';

export default function NgoProjectIndex({ params }: { params: { id: string } }) {
  redirect(`/ong/projects/${params.id}/edit`);
}
