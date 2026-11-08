import { redirect } from "next/navigation";

/**
 * The booking request form is gone — this is a directory now. Send anyone who
 * lands on the old /request page to the chef directory.
 */
export default function RequestRedirect() {
  redirect("/chefs");
}
