import { notFound } from "next/navigation";
import chefsData from "@/data/chefs.json";
import { ChefData } from "@/components/ChefCard";
import ChefProfileClient from "./ChefProfileClient";

export function generateStaticParams() {
    return chefsData.map((chef) => ({
        id: chef.id,
    }));
}

export default function ChefProfilePage({ params }: { params: { id: string } }) {
    const rawChef = chefsData.find((c) => c.id === params.id);
    
    if (!rawChef) {
        notFound();
    }

    const chef: ChefData = {
        id: rawChef.id,
        first_name: rawChef.firstName,
        last_name: rawChef.lastName,
        title: rawChef.title,
        avatar_url: rawChef.avatarUrl,
        cover_url: rawChef.coverUrl,
        rating: rawChef.rating,
        review_count: rawChef.reviewCount,
        location: rawChef.location,
        price_per_guest: rawChef.pricePerGuest,
        cuisines: rawChef.cuisines,
        bio: rawChef.bio as string,
        whatsapp_link: rawChef.whatsappLink as string,
        // Carry over the featuredMenu which is used in the client component
        featuredMenu: (rawChef as any).featuredMenu
    } as ChefData;

    return <ChefProfileClient chef={chef} id={params.id} />;
}
