import { redirect } from "next/navigation";

/**
 * Booking status tracking is gone — this is a directory now. Send anyone who
 * lands on the old status page to the chef directory.
 */
export default function RequestStatusRedirect() {
  redirect("/chefs");
}
