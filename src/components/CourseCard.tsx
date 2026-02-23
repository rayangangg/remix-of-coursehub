import { Link } from "react-router-dom";
import { BadgeDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price_bdt: number;
  price_usd: number;
}

const CourseCard = ({ course }: { course: Course }) => {
  return (
    <div className="glass-card overflow-hidden group hover:glow-sm transition-all duration-300">
      <div className="h-48 bg-secondary/50 overflow-hidden">
        {course.image_url ? (
          <img
            src={course.image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BadgeDollarSign className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-display font-semibold text-lg text-foreground mb-2 line-clamp-2">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {course.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-primary font-bold text-lg">৳{course.price_bdt}</p>
            <p className="text-muted-foreground text-xs">${course.price_usd} USD</p>
          </div>
          <Link to={`/course/${course.id}`}>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground glow-sm">
              Enroll Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
