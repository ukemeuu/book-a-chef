import { redirect } from "next/navigation";

/**
 * Booking pages are gone — this is a directory now. Send anyone who lands on
 * an old /book/[slug] link to the chef's public profile.
 */
export default function BookRedirect({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/chefs/${params.slug}`);
}
