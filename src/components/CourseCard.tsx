import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
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
    <Link to={`/course/${course.id}`} className="block">
      <div className="glass-card overflow-hidden course-card-hover group">
        <div className="h-48 bg-secondary/50 overflow-hidden">
          {course.image_url ? (
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-green">
              <BookOpen className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-display font-semibold text-base text-foreground mb-2 line-clamp-2">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {course.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary font-bold text-lg font-display">BDT {course.price_bdt}</p>
              <p className="text-muted-foreground text-xs">${course.price_usd} USD</p>
            </div>
            <Button size="sm" className="btn-primary">
              Buy Now
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
